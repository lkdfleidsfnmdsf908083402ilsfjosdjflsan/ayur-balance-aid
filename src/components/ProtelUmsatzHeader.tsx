import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Euro, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const ABTEILUNG_SPALTE: Record<string, string> = {
  rezeption: 'rezeption_netto', kueche: 'kueche_netto', service: 'service_netto',
  fb: 'fb_gesamt_netto', spa: 'spa_gesamt_netto', therapie: 'therapie_netto',
  kosmetik: 'kosmetik_netto', extras: 'extras_netto',
};
const ABTEILUNG_BUDGET: Record<string, string> = {
  rezeption: 'Rezeption', kueche: 'Küche', service: 'Service', fb: 'F&B',
  spa: 'Spa', therapie: 'Spa', kosmetik: 'Spa', extras: 'Sonstiges',
};
const ABTEILUNG_LABEL: Record<string, string> = {
  rezeption: 'Logis-Erlöse', kueche: 'F&B Halbpension', service: 'Restaurantkasse',
  fb: 'F&B Gesamt', spa: 'Spa Gesamt', therapie: 'Therapie',
  kosmetik: 'Kosmetik & Verkauf', extras: 'Extras',
};
const MN = ['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const fmtE = (n: number|null) => n==null?'—':Math.abs(n)>=1000?`€${(n/1000).toFixed(1)}k`:`€${n.toFixed(0)}`;

interface MD { monat: number; netto: number; budget: number; }

export function ProtelUmsatzHeader({ abteilung }: { abteilung: string }) {
  const [md, setMd] = useState<MD[]>([]);
  const [loading, setLoading] = useState(true);
  const Y = new Date().getFullYear(), M = new Date().getMonth()+1;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const sp = ABTEILUNG_SPALTE[abteilung]||'total_netto';
      const ba = ABTEILUNG_BUDGET[abteilung]||abteilung;
      const [uR, bR] = await Promise.all([
        supabase.from('v_abteilung_umsatz_monat').select('*').eq('jahr',Y).order('monat'),
        supabase.from('budget_planung').select('monat,umsatz_budget').eq('jahr',Y).eq('abteilung',ba).order('monat'),
      ]);
      const u=uR.data||[], b=bR.data||[];
      const c: MD[]=[];
      for(let m=1;m<=12;m++){
        const uf=u.find((r:any)=>r.monat===m);
        const bf=b.find((r:any)=>r.monat===m);
        c.push({monat:m,netto:uf?(uf as any)[sp]||0:0,budget:bf?bf.umsatz_budget||0:0});
      }
      setMd(c); setLoading(false);
    })();
  }, [abteilung]);

  if(loading) return null;
  const ytdN=md.filter(m=>m.monat<=M).reduce((s,m)=>s+m.netto,0);
  const ytdB=md.filter(m=>m.monat<=M).reduce((s,m)=>s+m.budget,0);
  const ak=md.find(m=>m.monat===M);
  const bAbw=ytdB>0?((ytdN-ytdB)/ytdB)*100:0;

  return (
    <div className="mb-6 rounded-xl border border-border/40 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Euro className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{ABTEILUNG_LABEL[abteilung]||abteilung} — Protel {Y}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1"><Calendar className="h-3 w-3" />Live aus Protel</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{MN[M]} Ist</p>
          <p className="text-lg font-mono font-semibold text-foreground mt-0.5">{fmtE(ak?.netto||0)}</p>
          {(ak?.budget||0)>0&&<p className="text-[10px] text-muted-foreground">Budget: {fmtE(ak?.budget||0)}</p>}
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">YTD Ist</p>
          <p className="text-lg font-mono font-semibold text-emerald-500 mt-0.5">{fmtE(ytdN)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">YTD Budget</p>
          <p className="text-lg font-mono font-semibold text-foreground mt-0.5">{ytdB>0?fmtE(ytdB):'—'}</p>
        </div>
        <div className={`p-3 rounded-lg ${ytdB>0?(bAbw>=0?'bg-emerald-500/10':'bg-red-500/10'):'bg-muted/30'}`}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Abweichung</p>
          <div className="flex items-center gap-1 mt-0.5">
            {ytdB>0?(<>{bAbw>=0?<ArrowUpRight className="h-4 w-4 text-emerald-500"/>:<ArrowDownRight className="h-4 w-4 text-red-400"/>}<p className={`text-lg font-mono font-semibold ${bAbw>=0?'text-emerald-500':'text-red-400'}`}>{bAbw>=0?'+':''}{bAbw.toFixed(1)}%</p></>):(<p className="text-lg font-mono text-muted-foreground">—</p>)}
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        {md.filter(m=>m.monat<=M).map(m=>{
          const mx=Math.max(...md.filter(x=>x.monat<=M).map(x=>x.netto),1);
          return(<div key={m.monat} className="flex-1 flex flex-col items-center gap-0.5" title={`${MN[m.monat]}: €${m.netto.toLocaleString('de-DE')}`}><div className="w-full h-8 bg-muted/40 rounded-sm relative overflow-hidden"><div className={`absolute bottom-0 w-full rounded-sm ${m.monat===M?'bg-primary/60':'bg-emerald-500/40'}`} style={{height:`${(m.netto/mx)*100}%`}}/></div><span className="text-[9px] text-muted-foreground">{MN[m.monat]}</span></div>);
        })}
      </div>
    </div>
  );
}
