/**
 * FrontOfficeKpiView.tsx
 * Rezeption-Dashboard — Protel Live-Daten + Personalkosten aus PDF-Import
 *
 * Zwei Rezeptionen:
 *  - Front Office (Hauptrezeption)
 *  - Wellness/Medical (Spa-Rezeption)
 *
 * Tabs: Heute | Monat | Effizienz | Jahresvergleich
 */

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { format, getDaysInMonth } from "date-fns";
import { de } from "date-fns/locale";
import { Hotel, TrendingUp, TrendingDown, Minus, RefreshCw, LogIn, LogOut, DoorOpen, Users, CalendarDays, BarChart3, Euro, AlertTriangle, Clock } from "lucide-react";
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from "recharts";

const TOTAL_ROOMS = 59;
const MONTHS = ["J\u00e4nner","Februar","M\u00e4rz","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const FRONT_OFFICE_DEPTS = ["Front Office"];
const WELLNESS_DEPTS = ["Medical", "Wellness"];
const ALL_RECEPTION_DEPTS = [...FRONT_OFFICE_DEPTS, ...WELLNESS_DEPTS];

interface ProtelKpiTag { datum: string; auslastung_pct: number|null; adr: number|null; revpar: number|null; logis_netto: number|null; zimmer_belegt: number|null; ankuenfte: number|null; abreisen: number|null; }
interface EmployeeData { personalnummer: string; vorname: string; nachname: string; abteilung: string; brutto_monat: number|null; gesamtaufwand_monat: number|null; wochenstunden_soll: number|null; aktiv: boolean; }
interface EmployeeHistory { personalnummer: string; vorname: string; nachname: string; abteilung: string; position: string|null; jahr: number; monat: number; gesamtaufwand_monat: number; gesamtaufwand_normalisiert: number|null; }

type TrafficColor = "green"|"yellow"|"red";
function getOccColor(v: number|null): TrafficColor { if(v==null) return "yellow"; if(v>=70) return "green"; if(v>=50) return "yellow"; return "red"; }
function getAdrColor(v: number|null): TrafficColor { if(v==null) return "yellow"; if(v>=150) return "green"; if(v>=120) return "yellow"; return "red"; }
function getRevparColor(v: number|null): TrafficColor { if(v==null) return "yellow"; if(v>=100) return "green"; if(v>=70) return "yellow"; return "red"; }
const colorCls: Record<TrafficColor,string> = { green:"bg-green-500", yellow:"bg-yellow-500", red:"bg-red-500" };
const colorBg: Record<TrafficColor,string> = { green:"bg-green-500/10 border-green-500/30", yellow:"bg-yellow-500/10 border-yellow-500/30", red:"bg-red-500/10 border-red-500/30" };

function fmtEur(v: number|null|undefined): string { if(v==null) return "\u2013"; return v.toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}); }
function fmtPct(v: number|null|undefined): string { if(v==null) return "\u2013"; return v.toFixed(1)+" %"; }
function fmtNum(v: number|null|undefined): string { if(v==null) return "\u2013"; return Math.round(v).toLocaleString("de-DE"); }
function fmtDec(v: number|null|undefined, d=1): string { if(v==null) return "\u2013"; return v.toFixed(d); }

function DeltaBadge({current,previous,suffix=""}:{current:number|null|undefined;previous:number|null|undefined;suffix?:string}) {
  if(current==null||previous==null||previous===0) return null;
  const delta=((current-previous)/previous)*100;
  const pos=delta>0;
  const Icon=delta>0?TrendingUp:delta<0?TrendingDown:Minus;
  return <Badge variant="outline" className={`text-xs gap-1 ${pos?"text-green-600 border-green-300":delta===0?"text-gray-500":"text-red-600 border-red-300"}`}><Icon className="h-3 w-3"/>{delta>0?"+":""}{delta.toFixed(1)}%{suffix}</Badge>;
}

interface RezEff { name:string; color:string; mitarbeiterCount:number; fteCount:number; personalkosten:number; pkNorm:number; wStd:number; mStd:number; umsatzProStunde:number|null; kostenProEreignis:number|null; revenuePerFte:number|null; pkAnteil:number|null; hasStd:boolean; }

function calcEff(name:string,color:string,emps:EmployeeData[],hist:EmployeeHistory[],logis:number,events:number): RezEff {
  const cnt=emps.length;
  const withStd=emps.filter(e=>e.wochenstunden_soll&&e.wochenstunden_soll>0);
  const wStd=withStd.reduce((s,e)=>s+(e.wochenstunden_soll??0),0);
  const mStd=wStd*4.33;
  const fte=wStd/40;
  const pk=hist.reduce((s,h)=>s+(h.gesamtaufwand_monat??0),0);
  const pkN=hist.reduce((s,h)=>s+(h.gesamtaufwand_normalisiert??h.gesamtaufwand_monat??0),0);
  const hasStd=withStd.length>0;
  return { name,color,mitarbeiterCount:cnt,fteCount:fte,personalkosten:pk,pkNorm:pkN,wStd,mStd,hasStd,
    umsatzProStunde:hasStd&&mStd>0?logis/mStd:null,
    kostenProEreignis:events>0&&pkN>0?pkN/events:null,
    revenuePerFte:fte>0?logis/fte:null,
    pkAnteil:logis>0&&pkN>0?(pkN/logis)*100:null,
  };
}

export function FrontOfficeKpiView() {
  const [kpiData,setKpiData]=useState<ProtelKpiTag[]>([]);
  const [vjData,setVjData]=useState<ProtelKpiTag[]>([]);
  const [employees,setEmployees]=useState<EmployeeData[]>([]);
  const [empHistory,setEmpHistory]=useState<EmployeeHistory[]>([]);
  const [loading,setLoading]=useState(true);
  const [lastSync,setLastSync]=useState<Date|null>(null);
  const now=new Date();
  const [selYear,setSelYear]=useState(now.getFullYear());
  const [selMonth,setSelMonth]=useState(now.getMonth()+1);

  useEffect(()=>{loadData();},[selYear,selMonth]);

  const loadData=async()=>{
    setLoading(true);
    try {
      const dateFrom=`${selYear}-${String(selMonth).padStart(2,"0")}-01`;
      const dateTo=new Date(selYear,selMonth,0).toISOString().split("T")[0];
      const vjFrom=`${selYear-1}-${String(selMonth).padStart(2,"0")}-01`;
      const vjTo=new Date(selYear-1,selMonth,0).toISOString().split("T")[0];
      const [kR,vR,eR,hR]=await Promise.all([
        supabase.from("protel_kpi_tag").select("datum,auslastung_pct,adr,revpar,logis_netto,zimmer_belegt,ankuenfte,abreisen").gte("datum",dateFrom).lte("datum",dateTo).order("datum"),
        supabase.from("protel_kpi_tag").select("datum,auslastung_pct,adr,revpar,logis_netto,zimmer_belegt,ankuenfte,abreisen").gte("datum",vjFrom).lte("datum",vjTo).order("datum"),
        supabase.from("employees").select("personalnummer,vorname,nachname,abteilung,brutto_monat,gesamtaufwand_monat,wochenstunden_soll,aktiv").in("abteilung",ALL_RECEPTION_DEPTS).eq("aktiv",true),
        supabase.from("employees_history").select("personalnummer,vorname,nachname,abteilung,position,jahr,monat,gesamtaufwand_monat,gesamtaufwand_normalisiert").in("abteilung",ALL_RECEPTION_DEPTS).eq("jahr",selYear).eq("monat",selMonth),
      ]);
      setKpiData(kR.data||[]); setVjData(vR.data||[]); setEmployees(eR.data||[]); setEmpHistory(hR.data||[]);
      setLastSync(new Date());
    } catch(e){ console.error("Fehler:",e); }
    finally { setLoading(false); }
  };

  const today=useMemo(()=>{
    const s=format(now,"yyyy-MM-dd");
    return kpiData.find(k=>k.datum===s)||(kpiData.length?kpiData[kpiData.length-1]:null);
  },[kpiData]);

  const monthSummary=useMemo(()=>{
    if(!kpiData.length) return null;
    const v=kpiData.filter(k=>k.zimmer_belegt!=null&&k.zimmer_belegt>0);
    if(!v.length) return null;
    const sB=v.reduce((s,k)=>s+(k.zimmer_belegt??0),0);
    const sL=v.reduce((s,k)=>s+(k.logis_netto??0),0);
    return { days:v.length, totalDays:getDaysInMonth(new Date(selYear,selMonth-1)), avgOcc:v.reduce((s,k)=>s+(k.auslastung_pct??0),0)/v.length, avgAdr:sB>0?sL/sB:0, avgRevpar:v.reduce((s,k)=>s+(k.revpar??0),0)/v.length, sumLogis:sL, sumBelegt:sB, sumAnkuenfte:kpiData.reduce((s,k)=>s+(k.ankuenfte??0),0), sumAbreisen:kpiData.reduce((s,k)=>s+(k.abreisen??0),0) };
  },[kpiData,selYear,selMonth]);

  const vjSummary=useMemo(()=>{
    if(!vjData.length) return null;
    const v=vjData.filter(k=>k.zimmer_belegt!=null&&k.zimmer_belegt>0);
    if(!v.length) return null;
    const sB=v.reduce((s,k)=>s+(k.zimmer_belegt??0),0);
    const sL=v.reduce((s,k)=>s+(k.logis_netto??0),0);
    return { avgOcc:v.reduce((s,k)=>s+(k.auslastung_pct??0),0)/v.length, avgAdr:sB>0?sL/sB:0, avgRevpar:v.reduce((s,k)=>s+(k.revpar??0),0)/v.length, sumLogis:sL, sumAnkuenfte:vjData.reduce((s,k)=>s+(k.ankuenfte??0),0), days:v.length };
  },[vjData]);

  const eff=useMemo(()=>{
    const logis=monthSummary?.sumLogis??0;
    const events=(monthSummary?.sumAnkuenfte??0)+(monthSummary?.sumAbreisen??0);
    const foE=employees.filter(e=>FRONT_OFFICE_DEPTS.includes(e.abteilung));
    const foH=empHistory.filter(h=>FRONT_OFFICE_DEPTS.includes(h.abteilung));
    const weE=employees.filter(e=>WELLNESS_DEPTS.includes(e.abteilung));
    const weH=empHistory.filter(h=>WELLNESS_DEPTS.includes(h.abteilung));
    return { fo:calcEff("Front Office","#6366f1",foE,foH,logis,events), we:calcEff("Wellness / Medical","#10b981",weE,weH,logis,events), ge:calcEff("Gesamt","#64748b",[...foE,...weE],[...foH,...weH],logis,events) };
  },[employees,empHistory,monthSummary]);

  const missingStd=employees.some(e=>!e.wochenstunden_soll||e.wochenstunden_soll===0);
  const chartData=useMemo(()=>kpiData.map(k=>({tag:parseInt(k.datum.split("-")[2]),occ:k.auslastung_pct??0,adr:k.adr??0,revpar:k.revpar??0})),[kpiData]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Hotel className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Rezeption</h1>
            <p className="text-xs text-muted-foreground">Front Office + Wellness/Medical · {TOTAL_ROOMS} Zimmer{lastSync && <> · {format(lastSync,"HH:mm",{locale:de})}</>}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selMonth)} onValueChange={v=>setSelMonth(Number(v))}><SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue/></SelectTrigger><SelectContent>{MONTHS.map((m,i)=><SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent></Select>
          <Select value={String(selYear)} onValueChange={v=>setSelYear(Number(v))}><SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue/></SelectTrigger><SelectContent>{[2022,2023,2024,2025,2026].map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/></Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="heute" className="space-y-4">
          <TabsList>
            <TabsTrigger value="heute">Heute</TabsTrigger>
            <TabsTrigger value="monat">Monat</TabsTrigger>
            <TabsTrigger value="effizienz">Effizienz</TabsTrigger>
            <TabsTrigger value="vergleich">Jahresvergleich</TabsTrigger>
          </TabsList>

          {/* TAB 1: HEUTE */}
          <TabsContent value="heute" className="space-y-4">
            {today ? (<>
              <p className="text-sm text-muted-foreground">{format(new Date(today.datum),"EEEE, d. MMMM yyyy",{locale:de})}{today.datum!==format(now,"yyyy-MM-dd")&&<Badge variant="outline" className="ml-2 text-xs">Letzter verf\u00fcgbarer Tag</Badge>}</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className={`border-2 ${colorBg[getOccColor(today.auslastung_pct)]}`}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Auslastung</p><p className="text-3xl font-bold font-mono">{fmtPct(today.auslastung_pct)}</p><p className="text-xs text-muted-foreground">Ziel: \u2265 70%</p></div><div className={`w-4 h-4 rounded-full ${colorCls[getOccColor(today.auslastung_pct)]} shadow-md`}/></div></CardContent></Card>
                <Card className={`border-2 ${colorBg[getAdrColor(today.adr)]}`}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">ADR</p><p className="text-3xl font-bold font-mono">{fmtEur(today.adr)}</p><p className="text-xs text-muted-foreground">Ziel: \u2265 150 \u20ac</p></div><div className={`w-4 h-4 rounded-full ${colorCls[getAdrColor(today.adr)]} shadow-md`}/></div></CardContent></Card>
                <Card className={`border-2 ${colorBg[getRevparColor(today.revpar)]}`}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">RevPAR</p><p className="text-3xl font-bold font-mono">{fmtEur(today.revpar)}</p><p className="text-xs text-muted-foreground">Ziel: \u2265 100 \u20ac</p></div><div className={`w-4 h-4 rounded-full ${colorCls[getRevparColor(today.revpar)]} shadow-md`}/></div></CardContent></Card>
                <Card className="border"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Logis-Umsatz</p><p className="text-3xl font-bold font-mono">{fmtEur(today.logis_netto)}</p><p className="text-xs text-muted-foreground">Tagesumsatz netto</p></CardContent></Card>
              </div>
              <Card><CardContent className="p-4"><div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                <div className="p-3 bg-primary/10 rounded-lg"><DoorOpen className="h-4 w-4 mx-auto mb-1 text-primary"/><p className="text-xs text-muted-foreground">Belegt</p><p className="text-xl font-bold text-primary font-mono">{fmtNum(today.zimmer_belegt)}</p></div>
                <div className="p-3 bg-green-500/10 rounded-lg"><Hotel className="h-4 w-4 mx-auto mb-1 text-green-600"/><p className="text-xs text-muted-foreground">Frei</p><p className="text-xl font-bold text-green-600 font-mono">{today.zimmer_belegt!=null?TOTAL_ROOMS-today.zimmer_belegt:"\u2013"}</p></div>
                <div className="p-3 bg-green-500/10 rounded-lg"><LogIn className="h-4 w-4 mx-auto mb-1 text-green-600"/><p className="text-xs text-muted-foreground">Ank\u00fcnfte</p><p className="text-xl font-bold text-green-600 font-mono">{fmtNum(today.ankuenfte)}</p></div>
                <div className="p-3 bg-orange-500/10 rounded-lg"><LogOut className="h-4 w-4 mx-auto mb-1 text-orange-600"/><p className="text-xs text-muted-foreground">Abreisen</p><p className="text-xl font-bold text-orange-600 font-mono">{fmtNum(today.abreisen)}</p></div>
                <div className="p-3 bg-muted rounded-lg col-span-2"><BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground"/><p className="text-xs text-muted-foreground">Auslastung</p><div className="mt-1 w-full bg-muted-foreground/20 rounded-full h-3"><div className={`h-3 rounded-full transition-all ${colorCls[getOccColor(today.auslastung_pct)]}`} style={{width:`${Math.min(100,today.auslastung_pct??0)}%`}}/></div><p className="text-xs text-muted-foreground mt-1">{fmtNum(today.zimmer_belegt)} von {TOTAL_ROOMS}</p></div>
              </div></CardContent></Card>
            </>) : <Card><CardContent className="p-8 text-center text-muted-foreground">{loading?"Lade Protel-Daten...":"Keine Daten"}</CardContent></Card>}
          </TabsContent>

          {/* TAB 2: MONAT */}
          <TabsContent value="monat" className="space-y-4">
            {monthSummary ? (<>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">\u00d8 Auslastung</p><p className="text-3xl font-bold font-mono">{fmtPct(monthSummary.avgOcc)}</p><div className="flex items-center gap-2 mt-1"><p className="text-xs text-muted-foreground">{monthSummary.days}/{monthSummary.totalDays} Tage</p><DeltaBadge current={monthSummary.avgOcc} previous={vjSummary?.avgOcc??null} suffix=" VJ"/></div></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">\u00d8 ADR</p><p className="text-3xl font-bold font-mono">{fmtEur(monthSummary.avgAdr)}</p><div className="flex items-center gap-2 mt-1"><p className="text-xs text-muted-foreground">pro belegte Nacht</p><DeltaBadge current={monthSummary.avgAdr} previous={vjSummary?.avgAdr??null} suffix=" VJ"/></div></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">\u00d8 RevPAR</p><p className="text-3xl font-bold font-mono">{fmtEur(monthSummary.avgRevpar)}</p><div className="flex items-center gap-2 mt-1"><p className="text-xs text-muted-foreground">pro verf\u00fcgbare Nacht</p><DeltaBadge current={monthSummary.avgRevpar} previous={vjSummary?.avgRevpar??null} suffix=" VJ"/></div></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Logis-Umsatz</p><p className="text-3xl font-bold text-green-600 font-mono">{fmtEur(monthSummary.sumLogis)}</p><div className="flex items-center gap-2 mt-1"><p className="text-xs text-muted-foreground">{fmtNum(monthSummary.sumBelegt)} N\u00e4chte</p><DeltaBadge current={monthSummary.sumLogis} previous={vjSummary?.sumLogis??null} suffix=" VJ"/></div></CardContent></Card>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-green-500/10 rounded-lg"><LogIn className="h-5 w-5 text-green-600"/></div><div><p className="text-sm text-muted-foreground">Ank\u00fcnfte</p><p className="text-2xl font-bold font-mono">{fmtNum(monthSummary.sumAnkuenfte)}</p></div><DeltaBadge current={monthSummary.sumAnkuenfte} previous={vjSummary?.sumAnkuenfte??null} suffix=" VJ"/></CardContent></Card>
                <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-orange-500/10 rounded-lg"><LogOut className="h-5 w-5 text-orange-600"/></div><div><p className="text-sm text-muted-foreground">Abreisen</p><p className="text-2xl font-bold font-mono">{fmtNum(monthSummary.sumAbreisen)}</p></div></CardContent></Card>
              </div>
              {chartData.length>0&&<Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tagesverlauf \u2014 {MONTHS[selMonth-1]} {selYear}</CardTitle></CardHeader><CardContent><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:5,right:10,left:0,bottom:0}}><defs><linearGradient id="occG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="tag" tick={{fontSize:11}} stroke="hsl(var(--muted-foreground))"/><YAxis yAxisId="left" tick={{fontSize:11}} stroke="hsl(var(--muted-foreground))" domain={[0,100]} unit="%"/><YAxis yAxisId="right" orientation="right" tick={{fontSize:11}} stroke="hsl(var(--muted-foreground))"/><ReTooltip contentStyle={{background:"hsl(var(--card))",border:"1px solid hsl(var(--border))",borderRadius:8,fontSize:12}}/><Legend wrapperStyle={{fontSize:11}}/><Area yAxisId="left" type="monotone" dataKey="occ" name="Auslastung %" stroke="#6366f1" fill="url(#occG)" strokeWidth={2}/><Line yAxisId="right" type="monotone" dataKey="adr" name="ADR \u20ac" stroke="#10b981" strokeWidth={2} dot={false}/><Line yAxisId="right" type="monotone" dataKey="revpar" name="RevPAR \u20ac" stroke="#f59e0b" strokeWidth={2} dot={false}/></AreaChart></ResponsiveContainer></div></CardContent></Card>}
            </>) : <Card><CardContent className="p-8 text-center text-muted-foreground">{loading?"Lade...":"Keine Daten"}</CardContent></Card>}
          </TabsContent>

          {/* TAB 3: EFFIZIENZ */}
          <TabsContent value="effizienz" className="space-y-4">
            {missingStd&&<Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10"><AlertTriangle className="h-4 w-4 text-yellow-600"/><AlertDescription className="text-yellow-700"><strong>Soll-Stunden fehlen</strong> \u2014 Bitte Wochenstunden in Mitarbeiter-Stammdaten pflegen.</AlertDescription></Alert>}

            <div className="grid gap-4 md:grid-cols-2">
              {[eff.fo,eff.we].map(r=>(<Card key={r.name} className="border-2" style={{borderColor:r.color+"40"}}><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:r.color}}/>{r.name}<Badge variant="outline" className="ml-auto text-xs">{r.mitarbeiterCount} MA</Badge></CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg text-center"><Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground"/><p className="text-xs text-muted-foreground">Mitarbeiter</p><p className="text-lg font-bold font-mono">{r.mitarbeiterCount}</p></div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center"><Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground"/><p className="text-xs text-muted-foreground">FTE</p><p className="text-lg font-bold font-mono">{r.hasStd?fmtDec(r.fteCount):"\u2013"}</p></div>
                  </div>
                  <div className="p-3 bg-red-500/5 rounded-lg"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Euro className="h-4 w-4 text-red-500"/><p className="text-sm text-muted-foreground">Personalkosten</p></div><p className="text-lg font-bold font-mono">{fmtEur(r.pkNorm||r.personalkosten)}</p></div></div>
                  {r.hasStd&&<div className="p-3 bg-blue-500/5 rounded-lg flex items-center justify-between"><p className="text-sm text-muted-foreground">Monatsstunden</p><p className="font-bold font-mono">{fmtNum(r.mStd)} h</p></div>}
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Effizienz-KPIs</p>
                    <div className="flex items-center justify-between py-1.5"><p className="text-sm">Umsatz / MA-Stunde</p><p className="font-bold font-mono text-sm">{r.umsatzProStunde!=null?fmtEur(r.umsatzProStunde):<span className="text-muted-foreground text-xs">Std. fehlen</span>}</p></div>
                    <div className="flex items-center justify-between py-1.5"><p className="text-sm">Kosten / Ereignis</p><p className="font-bold font-mono text-sm">{fmtEur(r.kostenProEreignis)}</p></div>
                    <p className="text-xs text-muted-foreground -mt-1">Personalkosten \u00f7 (Ank\u00fcnfte + Abreisen)</p>
                    <div className="flex items-center justify-between py-1.5"><p className="text-sm">Revenue / FTE</p><p className="font-bold font-mono text-sm">{r.revenuePerFte!=null?fmtEur(r.revenuePerFte):<span className="text-muted-foreground text-xs">FTE fehlt</span>}</p></div>
                    {r.pkAnteil!=null&&<div className="flex items-center justify-between py-1.5"><p className="text-sm">PK-Anteil am Umsatz</p><Badge variant={r.pkAnteil<=25?"default":r.pkAnteil<=35?"secondary":"destructive"} className="font-mono">{fmtPct(r.pkAnteil)}</Badge></div>}
                  </div>
                </CardContent>
              </Card>))}
            </div>

            <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5 text-muted-foreground"/>Rezeption Gesamt \u2014 {MONTHS[selMonth-1]} {selYear}</CardTitle></CardHeader>
              <CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 px-3 font-medium">KPI</th><th className="text-right py-2 px-3 font-medium">Front Office</th><th className="text-right py-2 px-3 font-medium">Wellness/Med.</th><th className="text-right py-2 px-3 font-semibold">Gesamt</th></tr></thead>
                <tbody className="divide-y divide-border/50">
                  {[{l:"Mitarbeiter",a:String(eff.fo.mitarbeiterCount),b:String(eff.we.mitarbeiterCount),c:String(eff.ge.mitarbeiterCount)},{l:"FTE",a:fmtDec(eff.fo.fteCount),b:fmtDec(eff.we.fteCount),c:fmtDec(eff.ge.fteCount)},{l:"Personalkosten",a:fmtEur(eff.fo.pkNorm),b:fmtEur(eff.we.pkNorm),c:fmtEur(eff.ge.pkNorm)},{l:"Monatsstunden",a:eff.fo.hasStd?fmtNum(eff.fo.mStd)+"h":"\u2013",b:eff.we.hasStd?fmtNum(eff.we.mStd)+"h":"\u2013",c:eff.ge.hasStd?fmtNum(eff.ge.mStd)+"h":"\u2013"},{l:"Umsatz/Stunde",a:fmtEur(eff.fo.umsatzProStunde),b:fmtEur(eff.we.umsatzProStunde),c:fmtEur(eff.ge.umsatzProStunde)},{l:"Kosten/Ereignis",a:fmtEur(eff.fo.kostenProEreignis),b:fmtEur(eff.we.kostenProEreignis),c:fmtEur(eff.ge.kostenProEreignis)},{l:"Revenue/FTE",a:fmtEur(eff.fo.revenuePerFte),b:fmtEur(eff.we.revenuePerFte),c:fmtEur(eff.ge.revenuePerFte)},{l:"PK-Anteil",a:fmtPct(eff.fo.pkAnteil),b:fmtPct(eff.we.pkAnteil),c:fmtPct(eff.ge.pkAnteil)}].map((r,i)=><tr key={i}><td className="py-2.5 px-3 font-medium">{r.l}</td><td className="py-2.5 px-3 text-right font-mono" style={{color:"#6366f1"}}>{r.a}</td><td className="py-2.5 px-3 text-right font-mono" style={{color:"#10b981"}}>{r.b}</td><td className="py-2.5 px-3 text-right font-mono font-semibold">{r.c}</td></tr>)}
                </tbody></table></div>
                {monthSummary&&<div className="mt-4 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs"><div><p className="text-muted-foreground">Logis-Umsatz</p><p className="font-bold font-mono">{fmtEur(monthSummary.sumLogis)}</p></div><div><p className="text-muted-foreground">Ank\u00fcnfte</p><p className="font-bold font-mono">{fmtNum(monthSummary.sumAnkuenfte)}</p></div><div><p className="text-muted-foreground">Abreisen</p><p className="font-bold font-mono">{fmtNum(monthSummary.sumAbreisen)}</p></div><div><p className="text-muted-foreground">Ereignisse</p><p className="font-bold font-mono">{fmtNum((monthSummary.sumAnkuenfte??0)+(monthSummary.sumAbreisen??0))}</p></div></div>}
              </CardContent>
            </Card>

            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Mitarbeiter-Details</CardTitle></CardHeader>
              <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border bg-muted/30"><th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th><th className="text-left py-2 px-3 font-medium text-muted-foreground">Abteilung</th><th className="text-left py-2 px-3 font-medium text-muted-foreground">Position</th><th className="text-right py-2 px-3 font-medium text-muted-foreground">Wo.-Std.</th><th className="text-right py-2 px-3 font-medium text-muted-foreground">Gesamtaufwand</th></tr></thead>
                <tbody className="divide-y divide-border/40">
                  {employees.map(e=>{const h=empHistory.find(x=>x.personalnummer===e.personalnummer);const isFO=FRONT_OFFICE_DEPTS.includes(e.abteilung);return(<tr key={e.personalnummer} className="hover:bg-muted/20"><td className="py-2 px-3 font-medium">{e.nachname}, {e.vorname}</td><td className="py-2 px-3"><Badge variant="outline" className="text-xs" style={{borderColor:isFO?"#6366f140":"#10b98140",color:isFO?"#6366f1":"#10b981"}}>{e.abteilung}</Badge></td><td className="py-2 px-3 text-muted-foreground">{h?.position||"\u2013"}</td><td className="py-2 px-3 text-right font-mono">{e.wochenstunden_soll?`${e.wochenstunden_soll}h`:<span className="text-yellow-600">{"\u2013"}</span>}</td><td className="py-2 px-3 text-right font-mono">{h?fmtEur(h.gesamtaufwand_monat):fmtEur(e.gesamtaufwand_monat)}</td></tr>);})}
                  {employees.length===0&&<tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Keine MA gefunden. Lohnliste importieren.</td></tr>}
                </tbody></table></div></CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: JAHRESVERGLEICH */}
          <TabsContent value="vergleich" className="space-y-4">
            {monthSummary&&vjSummary ? (
              <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><CalendarDays className="h-4 w-4"/>{MONTHS[selMonth-1]} {selYear} vs. {selYear-1}</CardTitle></CardHeader>
                <CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left py-3 px-4 text-muted-foreground font-medium">KPI</th><th className="text-right py-3 px-4 text-muted-foreground font-medium">{selYear}</th><th className="text-right py-3 px-4 text-muted-foreground font-medium">{selYear-1}</th><th className="text-right py-3 px-4 text-muted-foreground font-medium">{"\u0394"}</th></tr></thead>
                  <tbody className="divide-y divide-border/50">
                    {[{l:"\u00d8 Auslastung",c:monthSummary.avgOcc,p:vjSummary.avgOcc,f:fmtPct},{l:"\u00d8 ADR",c:monthSummary.avgAdr,p:vjSummary.avgAdr,f:fmtEur},{l:"\u00d8 RevPAR",c:monthSummary.avgRevpar,p:vjSummary.avgRevpar,f:fmtEur},{l:"Logis-Umsatz",c:monthSummary.sumLogis,p:vjSummary.sumLogis,f:fmtEur},{l:"Ank\u00fcnfte",c:monthSummary.sumAnkuenfte,p:vjSummary.sumAnkuenfte,f:fmtNum}].map((r,i)=><tr key={i}><td className="py-3 px-4 font-medium">{r.l}</td><td className="py-3 px-4 text-right font-mono">{r.f(r.c)}</td><td className="py-3 px-4 text-right font-mono text-muted-foreground">{r.f(r.p)}</td><td className="py-3 px-4 text-right"><DeltaBadge current={r.c} previous={r.p}/></td></tr>)}
                  </tbody></table></div></CardContent>
              </Card>
            ) : <Card><CardContent className="p-8 text-center text-muted-foreground">{loading?"Lade...":"Keine Vorjahresdaten"}</CardContent></Card>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
