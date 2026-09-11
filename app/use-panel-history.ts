"use client";
import {useEffect,useRef} from "react";

// URL holds navigation only; answers, images and patient information must never go here.
export function usePanelHistory(value:Record<string,string>, restore:(value:Record<string,string>)=>void, ready=true) {
  const serialized=JSON.stringify(value);
  const latest=useRef(restore);latest.current=restore;
  const initialized=useRef(false), restoring=useRef(false), previous=useRef("");
  useEffect(()=>{
    if(!ready)return;
    const read=()=>{
      const params=new URLSearchParams(location.hash.slice(1));
      let next:Record<string,string>={};
      try {const parsed=JSON.parse(params.get("panel")||"{}");if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)&&Object.values(parsed).every(v=>typeof v==="string"))next=parsed;}catch{/* Invalid links return to this module's list. */}
      restoring.current=true;latest.current(next);
    };
    if(!initialized.current){initialized.current=true;if(new URLSearchParams(location.hash.slice(1)).has("panel"))read();}
    window.addEventListener("edu-route-restored",read);
    return()=>window.removeEventListener("edu-route-restored",read);
  },[ready]);
  useEffect(()=>{
    if(!ready)return;
    if(restoring.current){restoring.current=false;previous.current="";return;}
    const params=new URLSearchParams(location.hash.slice(1));
    if(params.get("panel")===serialized){previous.current=serialized;return;}
    params.set("panel",serialized);
    if(previous.current)history.pushState(null,"","#"+params);else history.replaceState(null,"","#"+params);
    previous.current=serialized;
    window.dispatchEvent(new Event("edu-route-written"));
    requestAnimationFrame(()=>{const heading=Array.from(document.querySelectorAll<HTMLElement>(".edu-workspace h1,.edu-workspace h2")).find(h=>h.offsetParent!==null);if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}});
  },[serialized,ready]);
}
