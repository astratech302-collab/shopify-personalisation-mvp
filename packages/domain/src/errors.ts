import type {SafeErrorCode} from '../../contracts/src/common';
const messages:Record<SafeErrorCode,string>={invalid_request:'The request is invalid.',invalid_transition:'This experiment action is unavailable in its current state.',conflict:'The record changed. Reload and try again.',not_found:'The requested record is unavailable.',unauthorised:'Sign in to continue.',provider_unavailable:'The provider is temporarily unavailable.',provider_rejected:'Reconnect or check the provider permissions.',rate_limited:'Wait before trying again.',storage_unavailable:'Storage is temporarily unavailable.',invalid_secret:'The stored credential could not be opened.'};
export class DomainError extends Error{
 constructor(readonly code:SafeErrorCode,readonly retryable=false){super(messages[code]);this.name='DomainError';}
 toJSON(){return {schemaVersion:1 as const,error:{code:this.code,message:this.message,retryable:this.retryable}};}
}
/** Never serialise arbitrary Error.message, cause, response bodies or validation input. */
export function toSafeError(error:unknown){return (error instanceof DomainError?new DomainError(error.code,error.retryable):new DomainError('invalid_request')).toJSON();}
