'use client';
import {useEffect,useState} from 'react';
export default function CatalogImage({src,name}:{src:string|null;name:string}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return <div className="flex h-44 items-center justify-center border-b bg-slate-50 p-4">{src&&!failed?<img src={src} alt={name} width={320} height={180} loading="lazy" onError={()=>setFailed(true)} className="h-full w-full object-contain"/>:<p className="text-sm text-slate-500">{failed?'Photo could not be loaded':'Photo needed'}</p>}</div>}
