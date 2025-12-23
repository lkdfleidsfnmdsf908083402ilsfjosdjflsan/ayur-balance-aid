import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface AdminReport {
  id: string;
  report_date: string;
  open_positions: number;
  applications_received: number;
  new_hires: number;
  terminations: number;
  sick_days: number;
  total_employees: number;
  open_invoices_count: number;
  open_invoices_value: number;
  paid_invoices_count: number;
  open_receivables: number;
  it_tickets_open: number;
  it_tickets_resolved: number;
  system_downtime_min: number;
  deliveries_received: number;
  supplier_complaints: number;
  sick_rate_pct: number | null;
  open_positions_rate_pct: number | null;
  monthly_turnover_rate_pct: number | null;
  payment_compliance_pct: number | null;
  dso_days: number | null;
  dpo_days: number | null;
  it_availability_pct: number | null;
  it_resolution_rate_pct: number | null;
  supplier_complaint_rate_pct: number | null;
}

interface AdminTrendChartsProps {
  data: AdminReport[];
  daysToShow: number;
}

export function AdminTrendCharts({ data, daysToShow }: AdminTrendChartsProps) {
  const chartData = data
    .slice(0, daysToShow)
    .reverse()
    .map((report) => ({
      date: format(new Date(report.report_date), "dd.MM", { locale: de }),
      fullDate: format(new Date(report.report_date), "dd.MM.yyyy", { locale: de }),
      openPositions: report.open_positions,
      applications: report.applications_received,
      newHires: report.new_hires,
      terminations: report.terminations,
      sickDays: report.sick_days,
      sickRate: report.sick_rate_pct,
      openPositionsRate: report.open_positions_rate_pct,
      turnoverRate: report.monthly_turnover_rate_pct,
      paymentCompliance: report.payment_compliance_pct,
      dso: report.dso_days,
      dpo: report.dpo_days,
      itAvailability: report.it_availability_pct,
      itResolution: report.it_resolution_rate_pct,
      itTicketsOpen: report.it_tickets_open,
      itTicketsResolved: report.it_tickets_resolved,
      supplierComplaintRate: report.supplier_complaint_rate_pct,
      openReceivables: report.open_receivables,
      openInvoices: report.open_invoices_value,
    }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* HR: Bewerbungen & Einstellungen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">HR: Bewerbungen & Personal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(label) => chartData.find(d => d.date === label)?.fullDate || label}
              />
              <Legend />
              <Bar dataKey="applications" name="Bewerbungen" fill="hsl(var(--primary))" />
              <Bar dataKey="newHires" name="Einstellungen" fill="hsl(142, 76%, 36%)" />
              <Bar dataKey="terminations" name="Kündigungen" fill="hsl(0, 84%, 60%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* HR: Kranken- & Fluktuationsrate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">HR: Kranken- & Stellenquote (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => value?.toFixed(2) + "%"}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sickRate"
                name="Krankenquote %"
                stroke="hsl(25, 95%, 53%)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="openPositionsRate"
                name="Offene Stellen %"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="turnoverRate"
                name="Fluktuation %"
                stroke="hsl(280, 84%, 60%)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Finanzen: DSO & DPO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Finanzen: DSO & DPO (Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => value?.toFixed(1) + " Tage"}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="dso"
                name="DSO (Forderungen)"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="dpo"
                name="DPO (Verbindlichkeiten)"
                stroke="hsl(25, 95%, 53%)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Finanzen: Offene Beträge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Finanzen: Offene Beträge (€)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => "€" + value?.toLocaleString("de-DE")}
              />
              <Legend />
              <Bar dataKey="openReceivables" name="Offene Forderungen" fill="hsl(var(--primary))" />
              <Bar dataKey="openInvoices" name="Offene Verbindlichkeiten" fill="hsl(25, 95%, 53%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* IT: Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">IT: Ticket-Entwicklung</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="itTicketsResolved" name="Gelöst" fill="hsl(142, 76%, 36%)" />
              <Bar dataKey="itTicketsOpen" name="Offen" fill="hsl(0, 84%, 60%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* IT: Verfügbarkeit & Resolution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">IT: Verfügbarkeit & Resolution (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[90, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => value?.toFixed(2) + "%"}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="itAvailability"
                name="Verfügbarkeit %"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="itResolution"
                name="Resolution Rate %"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
