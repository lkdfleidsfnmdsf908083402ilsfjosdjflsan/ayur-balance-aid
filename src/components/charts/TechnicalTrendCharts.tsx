import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface TechnicalReport {
  id: string;
  report_date: string;
  open_tickets: number;
  new_tickets: number;
  resolved_tickets: number;
  avg_resolution_time_min: number;
  preventive_maintenance_done: number;
  emergency_repairs: number;
  technicians_on_duty: number;
  external_costs: number;
  material_costs: number;
  energy_consumption_kwh: number;
  ticket_backlog_rate_pct: number | null;
  same_day_resolution_pct: number | null;
  preventive_maintenance_pct: number | null;
  emergency_rate_pct: number | null;
  tickets_per_technician: number | null;
  cost_per_ticket: number | null;
  energy_per_room: number | null;
}

interface TechnicalTrendChartsProps {
  data: TechnicalReport[];
  daysToShow: number;
}

export function TechnicalTrendCharts({ data, daysToShow }: TechnicalTrendChartsProps) {
  const chartData = data
    .slice(0, daysToShow)
    .reverse()
    .map((report) => ({
      date: format(new Date(report.report_date), "dd.MM", { locale: de }),
      fullDate: format(new Date(report.report_date), "dd.MM.yyyy", { locale: de }),
      openTickets: report.open_tickets,
      newTickets: report.new_tickets,
      resolvedTickets: report.resolved_tickets,
      resolutionTime: report.avg_resolution_time_min,
      backlogRate: report.ticket_backlog_rate_pct,
      sameDayResolution: report.same_day_resolution_pct,
      preventivePct: report.preventive_maintenance_pct,
      emergencyRate: report.emergency_rate_pct,
      ticketsPerTech: report.tickets_per_technician,
      costPerTicket: report.cost_per_ticket,
      energyPerRoom: report.energy_per_room,
      totalCosts: (report.external_costs || 0) + (report.material_costs || 0),
    }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Ticket-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ticket-Entwicklung</CardTitle>
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
              <Bar dataKey="newTickets" name="Neue Tickets" fill="hsl(var(--primary))" />
              <Bar dataKey="resolvedTickets" name="Erledigt" fill="hsl(142, 76%, 36%)" />
              <Bar dataKey="openTickets" name="Offen" fill="hsl(0, 84%, 60%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Same-Day Resolution & Backlog */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Erledigungsquoten (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => value?.toFixed(1) + "%"}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sameDayResolution"
                name="Same-Day %"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="backlogRate"
                name="Backlog %"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Wartung */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Wartung & Notfälle (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => value?.toFixed(1) + "%"}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="preventivePct"
                name="Präventiv %"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="emergencyRate"
                name="Notfall %"
                stroke="hsl(25, 95%, 53%)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Kosten */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Kosten (€)</CardTitle>
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
                formatter={(value: number) => "€" + value?.toFixed(2)}
              />
              <Legend />
              <Bar dataKey="totalCosts" name="Gesamtkosten" fill="hsl(var(--primary))" />
              <Bar dataKey="costPerTicket" name="Kosten/Ticket" fill="hsl(var(--secondary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Produktivität */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Produktivität</CardTitle>
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
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ticketsPerTech"
                name="Tickets/Techniker"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="resolutionTime"
                name="Ø Bearbeitungszeit (Min)"
                stroke="hsl(280, 84%, 60%)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Energie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Energie pro Zimmer (kWh)</CardTitle>
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
                formatter={(value: number) => value?.toFixed(2) + " kWh"}
              />
              <Line
                type="monotone"
                dataKey="energyPerRoom"
                name="kWh/Zimmer"
                stroke="hsl(142, 76%, 36%)"
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
