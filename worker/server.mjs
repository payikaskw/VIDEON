import express from "express";
import multer from "multer";
import FormData from "form-data";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { jwtVerify } from "jose";

const app=express();
const port=Number(process.env.PORT||8080);
const apiKey=process.env.DOODSTREAM_API_KEY;
const secret=process.env.UPLOAD_WORKER_SECRET;
const allowedOrigin=process.env.APP_ORIGIN;
const maxBytes=Number(process.env.MAX_UPLOAD_BYTES||5*1024*1024*1024);
const usedTokens=new Set();
const upload=multer({dest:path.join(os.tmpdir(),"videon-uploads"),limits:{fileSize:maxBytes,files:1}});

app.get("/health",(_req,res)=>res.json({ok:true,service:"videon-upload-worker"}));
app.options("/upload",(req,res)=>{res.setHeader("Access-Control-Allow-Origin",allowedOrigin||"*");res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Authorization,Content-Type");res.sendStatus(204)});
app.post("/upload",upload.single("file"),async(req,res)=>{
 res.setHeader("Access-Control-Allow-Origin",allowedOrigin||"*");
 let tempPath=req.file?.path;
 try{
  if(!apiKey||!secret)throw new Error("Worker secrets belum dikonfigurasi.");
  if(!req.file) return res.status(400).json({error:"File video tidak ditemukan."});
  const auth=req.headers.authorization||"";
  if(!auth.startsWith("Bearer "))return res.status(401).json({error:"Token upload tidak ada."});
  const {payload}=await jwtVerify(auth.slice(7),new TextEncoder().encode(secret),{issuer:"videon",audience:"videon-upload-worker"});
  if(payload.sub!=="upload"||typeof payload.jti!=="string"||usedTokens.has(payload.jti))return res.status(401).json({error:"Token upload tidak valid atau sudah digunakan."});
  usedTokens.add(payload.jti);
  const serverResponse=await fetch("https://doodapi.co/api/upload/server?key="+encodeURIComponent(apiKey));
  if(!serverResponse.ok)throw new Error("Tidak bisa mendapatkan server upload DoodStream.");
  const serverData=await serverResponse.json();
  if(serverData.status!==200||typeof serverData.result!=="string")throw new Error(serverData.msg||"Server upload DoodStream tidak tersedia.");
  const target=serverData.result+(serverData.result.includes("?")?"&":"?")+encodeURIComponent(apiKey);
  const form=new FormData();
  form.append("api_key",apiKey);
  form.append("file",fs.createReadStream(tempPath),{filename:req.file.originalname,contentType:req.file.mimetype||"application/octet-stream"});
  const uploadResponse=await fetch(target,{method:"POST",body:form,headers:form.getHeaders(),duplex:"half",signal:AbortSignal.timeout(1000*60*60)});
  const data=await uploadResponse.json();
  if(!uploadResponse.ok||data.status!==200)throw new Error(data.msg||"Upload ke DoodStream gagal.");
  const item=Array.isArray(data.result)?data.result[0]:data.result;
  if(!item?.filecode)throw new Error("DoodStream tidak mengembalikan filecode.");
  return res.json({ok:true,fileCode:item.filecode,title:typeof payload.title==="string"?payload.title:req.file.originalname,thumbnailUrl:item.single_img||item.splash_img||null,canplay:item.canplay===1});
 }catch(error){
  const message=error instanceof Error?error.message:"Upload worker gagal.";
  return res.status(500).json({error:message});
 }finally{if(tempPath)fs.promises.unlink(tempPath).catch(()=>{});}
});
app.listen(port,()=>console.log("VIDEON upload worker listening on "+port));
