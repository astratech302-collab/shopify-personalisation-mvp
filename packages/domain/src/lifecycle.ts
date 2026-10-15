import type {z} from 'zod';
import type {experimentStatus} from '../../contracts/src/common';
import {DomainError} from './errors';
export type ExperimentStatus=z.infer<typeof experimentStatus>;
export type ExperimentAction='edit'|'validate'|'validation_passed'|'validation_failed'|'publish'|'publication_succeeded'|'publication_failed'|'pause'|'resume'|'end';
const transitions:Partial<Record<ExperimentStatus,Partial<Record<ExperimentAction,ExperimentStatus>>>>={
 draft:{edit:'draft',validate:'validating',end:'ended'},
 validating:{edit:'draft',validation_passed:'ready',validation_failed:'draft',end:'ended'},
 ready:{edit:'draft',validate:'validating',publish:'publishing',end:'ended'},
 publishing:{publication_succeeded:'running',publication_failed:'publish_failed',pause:'paused',end:'ended'},
 publish_failed:{edit:'draft',validate:'validating',publish:'publishing',pause:'paused',end:'ended'},
 running:{pause:'paused',end:'ended'},paused:{resume:'publishing',end:'ended'},ended:{}
};
/** Structural rule only. Publication/resume services must independently recheck readiness and revision identity. */
export function transition(status:ExperimentStatus,action:ExperimentAction):ExperimentStatus{
 const next=transitions[status]?.[action];if(!next)throw new DomainError('invalid_transition');return next;
}
export function equalAllocation(alternatives:1|2):readonly number[]{
 if(alternatives===1)return [5000,5000];if(alternatives===2)return [3334,3333,3333];throw new DomainError('invalid_request');
}
