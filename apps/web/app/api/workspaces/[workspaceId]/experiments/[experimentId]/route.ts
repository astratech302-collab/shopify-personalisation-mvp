import {withMerchant} from '../../../../../../lib/merchant';
export const dynamic='force-dynamic';
export async function GET(_request:Request,context:{params:Promise<{workspaceId:string;experimentId:string}>}){const {workspaceId,experimentId}=await context.params;return withMerchant(api=>api.experiment(workspaceId,experimentId));}
