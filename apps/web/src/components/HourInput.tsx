'use client';

import React, { useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import clsx from 'clsx';

type Props = {
  value?: string;                 // 'HH:MM'
  onChange?: (v: string) => void; // retorna '' si inválido/vacío
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
};

const isValid = (v: string) => {
  if (!/^\d{2}:\d{2}$/.test(v)) return false;
  const [hh, mm] = v.split(':').map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
};

const normalizeLoose = (raw: string): string => {
  // Acepta '9', '930', '0930', '9:3', etc. y devuelve '09:30' si puede.
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 3) return '';         // insuficiente para formar HH:MM
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4).padEnd(2, '0');
  const candidate = `${hh}:${mm}`;
  return isValid(candidate) ? candidate : '';
};

export default function HourInput({
  value,
  onChange,
  placeholder = '--:--',
  className,
  id,
  name,
}: Props) {
  const [local, setLocal] = useState(value ?? '');

  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);

  const emit = (v: string) => onChange?.(v);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Permitir navegación/edición básica
    const allowed = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End',
    ];
    if (allowed.includes(e.key)) return;

    // Solo dígitos y ':'
    if (!/^\d$/.test(e.key) && e.key !== ':') {
      e.preventDefault();
      return;
    }

    // Evitar que se escriban más de 5 chars o dos ':'
    const val = (e.currentTarget.value || '');
    if (val.length >= 5 && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
      e.preventDefault();
      return;
    }
    if (e.key === ':' && val.includes(':')) {
      e.preventDefault();
    }
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d:]/g, '');

    // auto insertar ':' tras 2 dígitos si no existe
    const digits = v.replace(/\D/g, '');
    if (digits.length >= 3 && !v.includes(':')) {
      v = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }

    // Limitar estructura a 'dd:dd'
    v = v.slice(0, 5);
    setLocal(v);

    // Solo emito cuando parece válido
    if (isValid(v)) emit(v);
  };

  const onBlur = () => {
    // Normalizar loose → estricto o vaciar si no es válido
    const strict =
      isValid(local) ? local :
      normalizeLoose(local) || '';
    setLocal(strict);
    emit(strict);
  };

  return (
    <input
      id={id}
      name={name}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={local}
      onChange={onInput}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      aria-invalid={!!local && !isValid(local)}
      className={clsx(
        'input w-[110px] text-center tracking-wider',
        // estado inválido sutil
        local && !isValid(local) && 'border-red-400/50 shadow-[0_0_10px_rgba(255,64,64,0.25)]',
        className
      )}
      maxLength={5}
      pattern="^\d{2}:\d{2}$"
    />
  );
}
