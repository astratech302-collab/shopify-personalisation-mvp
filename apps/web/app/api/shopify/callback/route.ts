import {withShopify} from '../../../../lib/shopify';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return withShopify(api=>api.callback(request));}
