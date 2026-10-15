import {withMerchant} from '../../../../lib/merchant';
export const dynamic='force-dynamic';
export async function GET(_request:Request,context:{params:Promise<{workspaceId:string}>}){const {workspaceId}=await context.params;return withMerchant(api=>api.workspace(workspaceId));}
