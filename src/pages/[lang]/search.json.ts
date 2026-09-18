import {docs} from '../../lib/docs.mjs';
export function getStaticPaths(){return ['zh','en'].map(lang=>({params:{lang}}));}
export function GET({params}){return new Response(JSON.stringify(docs(params.lang).search),{headers:{'Content-Type':'application/json; charset=utf-8'}});}
