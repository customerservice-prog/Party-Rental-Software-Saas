"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function CustomerAutoRefresh(){
  const router=useRouter();
  useEffect(()=>{
    let stopped=false;
    let timer:ReturnType<typeof setInterval>|null=null;
    const refresh=()=>{
      if(stopped||document.visibilityState!=="visible")return;
      router.refresh();
    };
    const onFocus=()=>refresh();
    const onVisibility=()=>{if(document.visibilityState==="visible")refresh();};
    timer=setInterval(refresh,15000);
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{
      stopped=true;
      if(timer)clearInterval(timer);
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onVisibility);
    };
  },[router]);
  return null;
}
