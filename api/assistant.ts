import type {VercelRequest,VercelResponse} from "@vercel/node";
import type {Request,Response} from "express";
import {assistantHandler} from "../server/assistant";
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
 return assistantHandler(req as unknown as Request,res as unknown as Response);
}
