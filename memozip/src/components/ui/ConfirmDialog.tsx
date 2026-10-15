import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Input } from './Input';

interface ConfirmProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancel', destructive, onConfirm, onClose }: ConfirmProps) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} data-autofocus="">{cancelLabel}</Button>
          <Button variant={destructive ? 'danger' : 'primary'} loading={busy} onClick={run}>{confirmLabel}</Button>
        </>
      }
    />
  );
}

interface RenameProps {
  open: boolean;
  title: string;
  label: string;
  initialValue: string;
  submitLabel?: string;
  description?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
  extra?: ReactNode;
}

/** Used for renaming and for naming new folders. */
export function NameDialog(props: RenameProps) {
  return props.open ? <NameDialogBody {...props} /> : null;
}

function NameDialogBody({ open, title, label, initialValue, submitLabel = 'Save', description, onSubmit, onClose }: RenameProps) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const trimmed = value.trim();
  const submit = async () => {
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={busy} disabled={!trimmed} onClick={submit}>{submitLabel}</Button>
        </>
      }
    >
      <Input
        label={label}
        value={value}
        maxLength={80}
        data-autofocus=""
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void submit();
          }
        }}
      />
    </Modal>
  );
}
