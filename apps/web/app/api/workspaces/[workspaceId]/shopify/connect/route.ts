import {withShopify} from '../../../../../../lib/shopify';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){const {workspaceId}=await params;return withShopify(api=>api.connect(request,workspaceId));}
