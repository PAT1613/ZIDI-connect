import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

/**
 * Cross-platform date picker with a consistent ``YYYY-MM-DD`` wire format.
 *
 * Android shows a modal picker on tap; iOS uses an inline compact picker;
 * web falls back to a native ``<input type="date">`` (RN Web renders this
 * automatically). The API string always goes over the wire as YYYY-MM-DD so
 * existing serializers don't change.
 */
interface Props {
  label?: string;
  value?: string | null;
  onChange: (value: string) => void;
  minimumDate?: Date;
  placeholder?: string;
  editable?: boolean;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromIsoDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  placeholder = 'YYYY-MM-DD',
  editable = true,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const current = fromIsoDate(value);

  if (Platform.OS === 'web') {
    // RN Web renders <input type="date"> when the underlying is a TextInput
    // with an "input" element. Simpler: render a raw <input>.
    const WebInput = 'input' as unknown as React.ElementType;
    return (
      <View className="gap-1.5">
        {label ? <Text className="text-sm font-medium text-ink-700">{label}</Text> : null}
        <WebInput
          type="date"
          value={value ?? ''}
          disabled={!editable}
          onChange={(e: { target: { value: string } }) => onChange(e.target.value)}
          className="rounded-xl border border-ink-200 bg-white px-4 py-3 text-base text-ink-900"
        />
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerOpen(false);
    if (event.type === 'set' && selected) {
      onChange(toIsoDate(selected));
    }
  };

  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-ink-700">{label}</Text> : null}
      <Pressable
        onPress={() => editable && setPickerOpen(true)}
        className={`flex-row items-center rounded-xl border border-ink-200 bg-white px-4 py-3 ${editable ? '' : 'opacity-60'}`}
      >
        <Text className={`flex-1 text-base ${value ? 'text-ink-900' : 'text-ink-400'}`}>
          {value || placeholder}
        </Text>
      </Pressable>

      {pickerOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={current}
          mode="date"
          display="calendar"
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}

      {Platform.OS === 'ios' && pickerOpen ? (
        <View className="rounded-xl border border-ink-200 bg-white p-2">
          <DateTimePicker
            value={current}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            onChange={handleChange}
          />
          <Pressable onPress={() => setPickerOpen(false)} className="items-center py-2">
            <Text className="text-sm font-semibold text-brand-700">Done</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
