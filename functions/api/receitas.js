const ORGAO = 'JUNTA COMERCIAL DO ESTADO DA PARAIBA';
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const reply = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=900'}});
export async function onRequestGet({request}) {
  const url=new URL(request.url),ano=Number(url.searchParams.get('ano')),mes=Number(url.searchParams.get('mes'));
  if(!Number.isInteger(ano)||ano<2000||ano>2100||!Number.isInteger(mes)||mes<1||mes>12)return reply({erro:'Ano ou mês inválido.'},400);
  const dados=[];let paginas=1;
  try {
    for(let page=1;page<=paginas;page++){
      if(page>100)return reply({erro:'Limite de paginação atingido. Não foi apresentado total parcial.'},502);
      const api=new URL('https://api.dadosabertos.codata.pb.gov.br/api/v1/receita/receita_orcamentaria');
      api.searchParams.set('ano',ano);api.searchParams.set('mes',mes);api.searchParams.set('orgao',ORGAO);api.searchParams.set('page',page);api.searchParams.set('per_page',100);
      const res=await fetch(api.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
      if(!res.ok)throw new Error('API oficial indisponível (HTTP '+res.status+').');
      const json=await res.json();if(!Array.isArray(json.dados))throw new Error('Formato de resposta inesperado.');
      if(json.dados.some(r=>norm(r.orgao)!==ORGAO))throw new Error('Resposta contém registros de outro órgão.');
      if(json.dados.some(r=>Number(r.ano)!==ano||Number(r.mes)!==mes))throw new Error('Resposta contém registros de outro período.');
      dados.push(...json.dados);
      const p=Number(json.paginacao?.total_paginas ?? 1);if(!Number.isInteger(p)||p<1||p>100)throw new Error('Paginação inválida ou acima do limite seguro.');paginas=p;
    }
    return reply({dados,orgao:ORGAO,ano,mes});
  }catch(e){return reply({erro:e.message||'Erro na consulta à fonte oficial.'},502)}
}
