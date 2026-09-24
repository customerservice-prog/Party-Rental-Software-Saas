"use client";
import {useState} from "react";

function extractVideoId(input:string):string|null{
 const trimmed=input.trim();if(!trimmed)return null;
 const watch=trimmed.match(/[?&]v=([^&]+)/);if(watch)return watch[1];
 const short=trimmed.match(/youtu\.be\/([^?&]+)/);if(short)return short[1];
 const embed=trimmed.match(/youtube\.com\/embed\/([^?&]+)/);if(embed)return embed[1];
 return /^[a-zA-Z0-9_-]{6,}$/.test(trimmed)?trimmed:null;
}
export default function HomeScreen(){
 const[input,setInput]=useState(""),[videoId,setVideoId]=useState<string|null>(null);
 const play=()=>setVideoId(extractVideoId(input));
 return <section className="tenant-panel phase2-office-tool">
  <div className="phase2-widget-head"><div><h2>Office screen</h2><p>Keep a training video or company feed handy</p></div></div>
  <div className={"phase2-video-stage "+(videoId?"has-video":"is-empty")}>{videoId?<iframe src={"https://www.youtube.com/embed/"+videoId} title="Office screen" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/>:<div><span>▶</span><b>No video playing</b><small>Paste a YouTube link below when you need it.</small></div>}</div>
  <div className="phase2-inline-control"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")play();}} placeholder="YouTube link or video ID" aria-label="Office screen video"/><button onClick={play}>Play</button></div>
 </section>;
}
