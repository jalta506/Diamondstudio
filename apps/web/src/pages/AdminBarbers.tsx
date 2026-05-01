import { useEffect, useState, FormEvent } from 'react';
import AdminLayout from '../components/AdminLayout';
import { api, Barber, BARBER_COLOR_PRESETS } from '../lib/api';

const AVATAR_PRESETS = ['✂️', '🪒', '💈', '👨‍🦱', '💇', '🧔', '⭐', '🔥'];

export default function AdminBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | Barber | null>(null);
  const [confirm, setConfirm] = useState<Barber | null>(null);

  useEffect(() => {
    api.barbers.list().then(setBarbers).finally(() => setLoading(false));
  }, []);

  async function handleSave(data: Partial<Barber>, id?: string) {
    try {
      if (id) {
        const updated = await api.barbers.update(id, data);
        setBarbers((prev) => prev.map((b) => (b.id === id ? updated : b)));
      } else {
        const created = await api.barbers.create({
          name: data.name!,
          specialty: data.specialty,
          avatar: data.avatar,
          color: data.color ?? '#D4AF37',
          active: data.active ?? true,
        });
        setBarbers((prev) => [...prev, created]);
      }
      setModal(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  async function handleDelete(barber: Barber) {
    try {
      await api.barbers.delete(barber.id);
      setBarbers((prev) => prev.filter((b) => b.id !== barber.id));
      setConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  async function toggleActive(barber: Barber) {
    const updated = await api.barbers.update(barber.id, { active: !barber.active });
    setBarbers((prev) => prev.map((b) => (b.id === barber.id ? updated : b)));
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline text-3xl text-cream">Barberos</h1>
            <p className="text-cream/40 text-sm mt-1">
              {barbers.filter((b) => b.active).length} activos de {barbers.length}
            </p>
          </div>
          <button
            onClick={() => setModal('create')}
            className="bg-gold text-dark text-sm font-semibold px-4 py-2.5 hover:bg-gold/90 transition-colors"
          >
            + Agregar
          </button>
        </div>

        {loading && <p className="text-cream/30 text-sm text-center py-12">Cargando…</p>}

        {!loading && (
          <div className="space-y-3">
            {barbers.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                onEdit={() => setModal(barber)}
                onDelete={() => setConfirm(barber)}
                onToggle={() => toggleActive(barber)}
              />
            ))}
            {barbers.length === 0 && (
              <div className="border border-white/8 py-12 text-center">
                <p className="text-cream/30 text-sm">No hay barberos registrados</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal !== null && (
        <BarberModal
          barber={modal === 'create' ? undefined : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirm && (
        <ConfirmDialog
          message={`¿Eliminar a ${confirm.name}? Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </AdminLayout>
  );
}

// ── Barber card ───────────────────────────────────────────────────────────────

function BarberCard({
  barber,
  onEdit,
  onDelete,
  onToggle,
}: {
  barber: Barber;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 border border-white/10 bg-white/[0.02] transition-opacity ${
        barber.active ? '' : 'opacity-50'
      }`}
      style={{ borderLeftColor: barber.color, borderLeftWidth: 3 }}
    >
      {/* Avatar */}
      <span className="text-2xl w-9 text-center shrink-0">{barber.avatar ?? '✂️'}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-cream font-medium text-sm">{barber.name}</p>
        {barber.specialty && (
          <p className="text-cream/40 text-xs mt-0.5 truncate">{barber.specialty}</p>
        )}
      </div>

      {/* Active toggle */}
      <button
        onClick={onToggle}
        title={barber.active ? 'Desactivar' : 'Activar'}
        className={`text-xs px-2 py-0.5 border transition-colors ${
          barber.active
            ? 'border-emerald-500/30 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
            : 'border-red-500/30 text-red-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400'
        }`}
      >
        {barber.active ? 'Activo' : 'Inactivo'}
      </button>

      {/* Edit */}
      <button
        onClick={onEdit}
        className="text-cream/30 hover:text-cream/70 text-sm px-2 transition-colors"
      >
        Editar
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="text-cream/20 hover:text-red-400 text-sm px-1 transition-colors"
        title="Eliminar"
      >
        ✕
      </button>
    </div>
  );
}

// ── Barber form modal ─────────────────────────────────────────────────────────

function BarberModal({
  barber,
  onSave,
  onClose,
}: {
  barber?: Barber;
  onSave: (data: Partial<Barber>, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(barber?.name ?? '');
  const [specialty, setSpecialty] = useState(barber?.specialty ?? '');
  const [avatar, setAvatar] = useState(barber?.avatar ?? '✂️');
  const [color, setColor] = useState(barber?.color ?? '#D4AF37');
  const [active, setActive] = useState(barber?.active ?? true);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, specialty: specialty || undefined, avatar, color, active }, barber?.id);
    setSaving(false);
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-[#110d09] border border-white/15 w-full max-w-md p-7">
        <h2 className="font-headline text-xl text-cream mb-6">
          {barber ? 'Editar barbero' : 'Agregar barbero'}
        </h2>

        <form onSubmit={submit} className="space-y-5">
          {/* Name */}
          <Field label="Nombre">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base"
              required
              autoFocus
            />
          </Field>

          {/* Specialty */}
          <Field label="Especialidad">
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Cortes clásicos, barba…"
              className="input-base"
            />
          </Field>

          {/* Avatar */}
          <Field label="Ícono">
            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-9 h-9 text-lg border transition-colors ${
                    avatar === a ? 'border-gold bg-gold/10' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </Field>

          {/* Color */}
          <Field label="Color de acento">
            <div className="flex flex-wrap gap-2">
              {BARBER_COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 border-2 transition-colors ${
                    color === c ? 'border-cream scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>

          {/* Active */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 accent-gold"
            />
            <span className="text-cream/70 text-sm">Activo (visible para clientes)</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gold text-dark font-semibold py-2.5 text-sm hover:bg-gold/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 border border-white/15 text-cream/60 text-sm hover:text-cream transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-cream/60 text-xs tracking-wide uppercase mb-2">{label}</label>
      {children}
    </div>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Overlay onClose={onCancel}>
      <div className="bg-[#110d09] border border-white/15 w-full max-w-sm p-6">
        <p className="text-cream/80 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-cream font-semibold py-2.5 text-sm hover:bg-red-500 transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-white/15 text-cream/60 text-sm hover:text-cream transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// Tailwind class declared here so it's not purged
// input-base: bg-white/5 border border-white/10 text-cream px-3 py-2.5 text-sm w-full focus:outline-none focus:border-gold/60 transition-colors
