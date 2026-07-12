'use client';

import {
  AlertTriangle,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Import,
  Loader2,
  Search,
  Settings2,
  Upload,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import LinkedInIcon from '@/components/ui/LinkedInIcon';
import { STEFANINI_GROUP_COMPANIES } from '@/lib/linkedin/stefaniniCompanies';
import type {
  EditalRequirements,
  ImportResultsResponse,
  LinkedInProfileResult,
  RpaExportPayload,
  RpaSearchConfig,
} from '@/lib/linkedin/types';

const SAMPLE_EDITAL = `Cargo: Desenvolvedor Full Stack Senior
Localizacao: Remoto
Experiencia minima: 5 anos
Requisitos: React, Next.js, TypeScript, Node.js, PostgreSQL, Docker, AWS, arquitetura de APIs REST.
Desejavel: Scrum, CI/CD, comunicacao clara, colaboracao com times multidisciplinares.
Ingles tecnico para leitura e escrita.`;

const defaultSelectedCompanies = STEFANINI_GROUP_COMPANIES.map(company => company.id);

export default function LinkedInSourcingPage() {
  const [editalText, setEditalText] = useState(SAMPLE_EDITAL);
  const [editalFileName, setEditalFileName] = useState('');
  const [editalBase64, setEditalBase64] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(defaultSelectedCompanies);
  const [requirements, setRequirements] = useState<EditalRequirements | null>(null);
  const [campaignName, setCampaignName] = useState('Campanha Full Stack Senior');
  const [maxProfiles, setMaxProfiles] = useState(25);
  const [delayBetweenProfilesMs, setDelayBetweenProfilesMs] = useState(3500);
  const [headless, setHeadless] = useState(false);
  const [rescoreWithAi, setRescoreWithAi] = useState(false);
  const [results, setResults] = useState<LinkedInProfileResult[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const selectedCompanyObjects = useMemo(
    () => STEFANINI_GROUP_COMPANIES.filter(company => selectedCompanies.includes(company.id)),
    [selectedCompanies]
  );

  async function analyzeEdital() {
    setError('');
    setStatus('');
    setIsParsing(true);
    try {
      const response = await fetch('/api/linkedin/parse-edital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editalText, editalBase64, filename: editalFileName, companyIds: selectedCompanies }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao analisar edital.');
      setRequirements(data.requirements);
      setCampaignName(data.requirements.cargo ? `Campanha ${data.requirements.cargo}` : campaignName);
      setStatus(data.mode === 'ai' ? 'Edital analisado com IA.' : 'Edital analisado por heuristica local.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsParsing(false);
    }
  }

  async function exportConfig() {
    if (!requirements) {
      setError('Analise o edital antes de exportar a configuracao.');
      return;
    }

    setError('');
    setStatus('');
    setIsExporting(true);
    try {
      const response = await fetch('/api/linkedin/export-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          requirements,
          companyIds: selectedCompanies,
          maxProfiles,
          delayBetweenProfilesMs,
          headless,
        }),
      });
      const config = (await response.json()) as RpaSearchConfig & { error?: string };
      if (!response.ok) throw new Error(config.error || 'Falha ao exportar configuracao.');
      downloadJson(config, `linkedin-campaign-${config.campaignId}.json`);
      setStatus('Configuracao RPA exportada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function importResults(file: File) {
    if (!requirements) {
      setError('Analise o edital antes de importar resultados.');
      return;
    }

    setError('');
    setStatus('');
    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as RpaExportPayload;
      const response = await fetch('/api/linkedin/import-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, requirements, rescoreWithAi }),
      });
      const data = (await response.json()) as ImportResultsResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Falha ao importar resultados.');
      setResults(data.profiles);
      setStatus(`${data.totalProfiles} perfis importados e ranqueados.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
    }
  }

  function toggleCompany(id: string) {
    setSelectedCompanies(current =>
      current.includes(id) ? current.filter(companyId => companyId !== id) : [...current, id]
    );
  }

  async function handleEditalFile(file: File) {
    setError('');
    setStatus('');
    setEditalFileName(file.name);

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setEditalBase64(await readFileAsDataUrl(file));
      setEditalText('');
      setStatus(`PDF anexado: ${file.name}`);
      return;
    }

    setEditalBase64('');
    setEditalText(await file.text());
    setStatus(`Arquivo carregado: ${file.name}`);
  }

  return (
    <main className="min-h-screen bg-stefanini-mist">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-[#17325F] bg-stefanini-navy text-white lg:block">
          <div className="h-1.5 bg-[linear-gradient(90deg,#48BFD0_0%,#8DC63F_42%,#FF7A1A_76%,#2847A8_100%)]" />
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
            <div className="grid h-10 w-10 place-items-center rounded bg-white text-stefanini-navy">
              <LinkedInIcon size={20} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide text-white">LicitAI</p>
              <p className="text-xs font-semibold uppercase text-stefanini-cyan">Stefanini Group</p>
            </div>
          </div>
          <nav className="space-y-1 p-3">
            <SideItem icon={<FileText size={17} />} label="Editais" />
            <SideItem icon={<Users size={17} />} label="Base de talentos" />
            <SideItem active icon={<LinkedInIcon size={17} />} label="Busca LinkedIn" />
            <SideItem icon={<Settings2 size={17} />} label="Configuracoes" />
          </nav>
        </aside>

        <section className="flex-1">
          <header className="border-b border-line bg-white">
            <div className="h-1 bg-[linear-gradient(90deg,#061B49_0%,#2847A8_38%,#48BFD0_65%,#8DC63F_84%,#FF7A1A_100%)]" />
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stefanini-blue">
                  <LinkedInIcon size={16} />
                  Busca LinkedIn Stefanini
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-normal text-stefanini-navy">Sourcing por edital</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Metric label="Empresas" value={selectedCompanyObjects.length.toString()} />
                <Metric label="Perfis" value={results.length.toString()} />
                <Metric label="Limite" value={maxProfiles.toString()} />
              </div>
            </div>
          </header>

          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="space-y-4">
              {(status || error) && (
                <div
                  className={`flex items-start gap-3 rounded border px-4 py-3 text-sm ${
                    error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {error ? <AlertTriangle size={18} /> : <Check size={18} />}
                  <span>{error || status}</span>
                </div>
              )}

              <Panel title="Edital" icon={<FileText size={18} />}>
                <div className="grid gap-3">
                  <textarea
                    value={editalText}
                    onChange={event => setEditalText(event.target.value)}
                    placeholder={editalBase64 ? `PDF anexado: ${editalFileName}` : 'Cole o texto do edital ou anexe um PDF.'}
                    className="min-h-56 resize-y rounded border border-line bg-white p-3 text-sm leading-6 text-ink shadow-sm"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm">
                        <Upload size={16} />
                        Anexar edital
                        <input
                          type="file"
                          accept=".pdf,.txt,.md,.csv"
                          className="sr-only"
                          onChange={event => {
                            const file = event.target.files?.[0];
                            if (file) void handleEditalFile(file);
                          }}
                        />
                      </label>
                      {editalFileName && (
                        <span className="max-w-72 truncate rounded border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-muted">
                          {editalFileName}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={analyzeEdital}
                      disabled={isParsing}
                      className="inline-flex min-h-10 items-center gap-2 rounded bg-stefanini-blue px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-stefanini-navy disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isParsing ? <Loader2 className="animate-spin" size={17} /> : <Search size={17} />}
                      Analisar
                    </button>
                  </div>
                </div>
              </Panel>

              <Panel title="Empresas Stefanini" icon={<Users size={18} />}>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {STEFANINI_GROUP_COMPANIES.map(company => {
                    const active = selectedCompanies.includes(company.id);
                    return (
                      <button
                        key={company.id}
                        onClick={() => toggleCompany(company.id)}
                        className={`flex min-h-11 items-center justify-between rounded border px-3 py-2 text-left text-sm transition ${
                          active
                            ? 'border-stefanini-blue bg-[#EDF6FF] text-stefanini-navy'
                            : 'border-line bg-white text-muted hover:border-stefanini-cyan'
                        }`}
                      >
                        <span className="truncate font-semibold">{company.name}</span>
                        {active && <Check size={16} className="text-stefanini-blue" />}
                      </button>
                    );
                  })}
                </div>
              </Panel>

              {requirements && (
                <Panel title="Requisitos extraidos" icon={<Check size={18} />}>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <InfoBlock label="Cargo" value={requirements.cargo} />
                    <InfoBlock label="Senioridade" value={requirements.senioridade || 'Nao informada'} />
                    <InfoBlock label="Experiencia" value={requirements.experienciaMinima || 'Nao informada'} />
                    <InfoBlock label="Localizacao" value={requirements.localizacao || 'Nao informada'} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted">{requirements.descricao}</p>
                  <TagGroup label="Competencias tecnicas" items={requirements.competenciasTecnicas} />
                  <TagGroup label="Certificacoes" items={requirements.certificacoes} />
                  <div className="mt-4 rounded border border-line bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase text-muted">Query booleana</p>
                    <p className="mt-2 break-words font-mono text-sm text-ink">{requirements.booleanSearchQuery}</p>
                  </div>
                </Panel>
              )}

              <Panel title="Ranking" icon={<Users size={18} />}>
                {results.length ? (
                  <div className="space-y-3">
                    {results.map(profile => (
                      <ProfileRow key={profile.id} profile={profile} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-line bg-white p-6 text-center text-sm text-muted">
                    Nenhum resultado importado.
                  </div>
                )}
              </Panel>
            </section>

            <aside className="space-y-4">
              <Panel title="Configuracao RPA" icon={<Settings2 size={18} />}>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Nome da campanha</span>
                    <input
                      value={campaignName}
                      onChange={event => setCampaignName(event.target.value)}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Limite de perfis</span>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={maxProfiles}
                      onChange={event => setMaxProfiles(Number(event.target.value))}
                      className="mt-3 w-full accent-aqua"
                    />
                    <span className="mt-1 block text-sm text-muted">{maxProfiles} perfis</span>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Intervalo entre perfis</span>
                    <input
                      type="number"
                      min={2500}
                      step={500}
                      value={delayBetweenProfilesMs}
                      onChange={event => setDelayBetweenProfilesMs(Number(event.target.value))}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded border border-line bg-white px-3 py-2 text-sm">
                    <span className="font-semibold text-ink">Headless</span>
                    <input
                      type="checkbox"
                      checked={headless}
                      onChange={event => setHeadless(event.target.checked)}
                      className="h-5 w-5 accent-aqua"
                    />
                  </label>
                  <button
                    onClick={exportConfig}
                    disabled={isExporting || !requirements}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded bg-stefanini-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-stefanini-blue disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isExporting ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                    Exportar JSON
                  </button>
                </div>
              </Panel>

              <Panel title="Importar resultados" icon={<Import size={18} />}>
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-3 rounded border border-line bg-white px-3 py-2 text-sm">
                    <span className="font-semibold text-ink">Reavaliar com IA</span>
                    <input
                      type="checkbox"
                      checked={rescoreWithAi}
                      onChange={event => setRescoreWithAi(event.target.checked)}
                      className="h-5 w-5 accent-aqua"
                    />
                  </label>
                  <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-line bg-white px-4 py-5 text-center text-sm font-semibold text-ink">
                    {isImporting ? <Loader2 className="animate-spin text-aqua" size={20} /> : <Upload className="text-aqua" size={20} />}
                    JSON do RPA
                    <input
                      type="file"
                      accept=".json"
                      className="sr-only"
                      onChange={event => {
                        const file = event.target.files?.[0];
                        if (file) void importResults(file);
                      }}
                    />
                  </label>
                </div>
              </Panel>

              <Panel title="Execucao local" icon={<ChevronRight size={18} />}>
                <div className="space-y-2 rounded bg-[#111827] p-3 font-mono text-xs leading-5 text-slate-100">
                  <p>cd rpa/linkedin-sourcer</p>
                  <p>npm install</p>
                  <p>npx playwright install chromium</p>
                  <p>npm run login</p>
                  <p>npm run search -- --config linkedin-campaign.json</p>
                </div>
              </Panel>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function SideItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={`flex h-10 items-center gap-3 rounded px-3 text-sm font-semibold ${
        active ? 'bg-white text-stefanini-navy shadow-sm' : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded border border-line bg-white px-3 py-2 shadow-sm">
      <p className="text-xs font-bold uppercase text-muted">{label}</p>
      <p className="text-lg font-bold text-stefanini-navy">{value}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded border border-line border-t-2 border-t-stefanini-blue bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-stefanini-navy">
        <span className="text-stefanini-blue">{icon}</span>
        <h2 className="text-base font-bold tracking-normal">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stefanini-navy">{value}</p>
    </div>
  );
}

function TagGroup({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-bold uppercase text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span key={item} className="rounded border border-line bg-white px-2 py-1 text-xs font-semibold text-stefanini-navy">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProfileRow({ profile }: { profile: LinkedInProfileResult }) {
  const scoreColor =
    profile.matchScore >= 80 ? 'bg-stefanini-green' : profile.matchScore >= 60 ? 'bg-stefanini-orange' : 'bg-coral';

  return (
    <article className="rounded border border-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-stefanini-navy">{profile.name}</h3>
            <a
              href={profile.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-stefanini-blue"
              aria-label={`Abrir perfil de ${profile.name}`}
            >
              <ExternalLink size={16} />
            </a>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{profile.headline}</p>
          <p className="mt-1 text-xs font-semibold text-stefanini-navy">
            {profile.company || 'Empresa nao identificada'} {profile.location ? `- ${profile.location}` : ''}
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-28">
          <div className="h-2 rounded bg-slate-100">
            <div className={`h-2 rounded ${scoreColor}`} style={{ width: `${profile.matchScore}%` }} />
          </div>
          <p className="mt-1 text-right text-sm font-bold text-stefanini-navy">{profile.matchScore}%</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <EvidenceList title="Evidencias" items={profile.matchEvidence} />
        <EvidenceList title="Gaps" items={profile.gaps} />
      </div>
    </article>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase text-muted">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-ink">
        {items.length ? items.map(item => <li key={item}>{item}</li>) : <li>Nao informado</li>}
      </ul>
    </div>
  );
}

function downloadJson(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
