"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  useProviderPrograms,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
  type ProviderProgram,
} from "@/hooks/useProvider";
import { useAppStore } from "@/store/appStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, BookOpen } from "lucide-react";

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "",
  is_gap_filler: false,
  ages: "",
  cost: "",
  funding_eligible: false,
};

type ProgramForm = typeof EMPTY_FORM;

function ProgramModal({
  open,
  onClose,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: ProgramForm;
  onSave: (form: ProgramForm) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ProgramForm>(initial);
  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Reset form when initial changes (opening with different data)
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setForm(initial);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">
            {initial.title ? "Edit Program" : "Add Program"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label
              htmlFor="prog_title"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Title *
            </label>
            <Input
              id="prog_title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Social Skills Group"
            />
          </div>

          <div>
            <label
              htmlFor="prog_desc"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Description
            </label>
            <Textarea
              id="prog_desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the program..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="prog_type"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Type
              </label>
              <Input
                id="prog_type"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                placeholder="e.g. Group Therapy"
              />
            </div>
            <div>
              <label
                htmlFor="prog_ages"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Ages
              </label>
              <Input
                id="prog_ages"
                value={form.ages}
                onChange={(e) => set("ages", e.target.value)}
                placeholder="e.g. 6-10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="prog_cost"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Cost
            </label>
            <Input
              id="prog_cost"
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              placeholder="e.g. $85/session"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_gap_filler}
                onChange={(e) => set("is_gap_filler", e.target.checked)}
                className="rounded border-border"
              />
              Gap filler program
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.funding_eligible}
                onChange={(e) => set("funding_eligible", e.target.checked)}
                className="rounded border-border"
              />
              Funding eligible
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!form.title.trim() || saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial.title ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProgramRow({
  program,
  onEdit,
  onDelete,
  onToggleActive,
  isDemo,
}: {
  program: ProviderProgram;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isDemo: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {program.title}
          </h3>
          {program.is_gap_filler && (
            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
              Gap Filler
            </Badge>
          )}
          {program.funding_eligible && (
            <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
              Funded
            </Badge>
          )}
          {!program.active && (
            <Badge variant="secondary" className="text-xs bg-red-50 text-red-700">
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
          {program.type && <span>{program.type}</span>}
          {program.ages && <span>Ages {program.ages}</span>}
          {program.cost && <span>{program.cost}</span>}
        </div>
        {program.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {program.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleActive}
          disabled={isDemo}
          title={program.active ? "Deactivate" : "Activate"}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              program.active ? "bg-emerald-500" : "bg-gray-300"
            }`}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          disabled={isDemo}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={isDemo}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ProgramsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isDemo } = useAppStore();
  const { data: programs, isLoading } = useProviderPrograms();
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState<ProgramForm>(EMPTY_FORM);

  const openAdd = () => {
    setEditingId(null);
    setModalForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: ProviderProgram) => {
    setEditingId(p.id);
    setModalForm({
      title: p.title,
      description: p.description ?? "",
      type: p.type ?? "",
      is_gap_filler: p.is_gap_filler,
      ages: p.ages ?? "",
      cost: p.cost ?? "",
      funding_eligible: p.funding_eligible,
    });
    setModalOpen(true);
  };

  const handleSave = (form: ProgramForm) => {
    if (editingId) {
      updateProgram.mutate(
        { id: editingId, ...form },
        { onSuccess: () => setModalOpen(false) }
      );
    } else {
      createProgram.mutate(form, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this program?")) {
      deleteProgram.mutate(id);
    }
  };

  const handleToggleActive = (p: ProviderProgram) => {
    updateProgram.mutate({ id: p.id, active: !p.active });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user && !isDemo) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please sign in to manage programs.</p>
      </div>
    );
  }

  const list = programs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Programs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Services and programs your organization offers.
          </p>
        </div>
        <Button onClick={openAdd} disabled={isDemo} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Program
        </Button>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              No programs yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add your first program so families can discover the services you offer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <ProgramRow
              key={p.id}
              program={p}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
              onToggleActive={() => handleToggleActive(p)}
              isDemo={isDemo}
            />
          ))}
        </div>
      )}

      <ProgramModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={modalForm}
        onSave={handleSave}
        saving={createProgram.isPending || updateProgram.isPending}
      />
    </div>
  );
}
