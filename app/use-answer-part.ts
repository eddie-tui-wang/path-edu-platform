"use client";
import {useEffect,useState} from 'react';
export function useAnswerPart(key:string){
 const [saved,setSaved]=useState({key:'',part:'history'}),[error,setError]=useState('');
 useEffect(()=>{try{const part=sessionStorage.getItem(key)||'history';setSaved({key,part:['history','image','answer'].includes(part)?part:'history'});setError('');}catch{setSaved({key,part:'history'});setError('阅片标签无法恢复');}},[key]);
 function change(part:string){setSaved({key,part});try{sessionStorage.setItem(key,part);setError('');}catch{setError('当前标签未保存，答卷不受影响');}}
 return [saved.key===key?saved.part:'history',change,error] as const;
}
