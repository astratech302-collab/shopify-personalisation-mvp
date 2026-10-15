"use client";
import {useState,type FormEvent} from 'react';
export function WorkspaceForm(){
 const [name,setName]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage('');try{const response=await fetch('/api/workspaces',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({name})});const body=await response.json();setMessage(response.ok?`Workspace ready: ${body.data.name}`:body.error?.message??'Could not create the workspace.');}catch{setMessage('Connection failed. Please try again.');}finally{setBusy(false);}}
 return <form onSubmit={submit}><label htmlFor="workspace-name">Workspace name</label><input id="workspace-name" value={name} onChange={event=>setName(event.target.value)} required minLength={1} maxLength={80}/><button disabled={busy} type="submit">{busy?'Creating…':'Create workspace'}</button><p role="status">{message}</p></form>;
}
