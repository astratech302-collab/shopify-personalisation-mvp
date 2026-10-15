import {z} from 'zod';
import {id,variantId,timestamp,currency,amount} from './common';
const count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const row=z.object({variantId,assignedVisitors:count,renderedVisitors:count,cartVisitors:count,checkoutVisitors:count,convertedVisitors:count,purchaseCount:count,subtotalByCurrency:z.array(z.object({currency,observedCheckoutSubtotal:amount}).strict())}).strict().superRefine((v,c)=>{
 if([v.renderedVisitors,v.cartVisitors,v.checkoutVisitors,v.convertedVisitors].some(n=>n>v.assignedVisitors)||v.purchaseCount<v.convertedVisitors)c.addIssue({code:'custom',message:'Inconsistent visitor/order denominators'});
 if(new Set(v.subtotalByCurrency.map(m=>m.currency)).size!==v.subtotalByCurrency.length)c.addIssue({code:'custom',message:'Currency rows must be unique'});
});
export const report=z.object({schemaVersion:z.literal(1),experimentId:id,revisionId:id,generatedAt:timestamp,cohortStart:timestamp,cohortEnd:timestamp,outcomesMatureAt:timestamp,observationWindowDays:z.literal(7),denominator:z.literal('received_assignments_including_render_failures'),revenueSource:z.literal('observed_browser_checkout_subtotal'),decision:z.enum(['insufficient_evidence','immature','formal_analysis_pending']),variants:z.array(row).min(2).max(3),unmatchedPurchases:count,excludedQaEvents:count}).strict().superRefine((v,c)=>{
 if(Date.parse(v.cohortEnd)<Date.parse(v.cohortStart)||Date.parse(v.outcomesMatureAt)<Date.parse(v.cohortEnd)+7*86400000)c.addIssue({code:'custom',message:'Invalid cohort observation dates'});
 const expected=v.variants.length===2?['original','A']:['original','A','B'];if(v.variants.some((r,i)=>r.variantId!==expected[i]))c.addIssue({code:'custom',message:'Report variants must be ordered original, A, optional B'});
});
export type Report=z.infer<typeof report>;
