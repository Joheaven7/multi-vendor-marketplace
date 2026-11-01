"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { MAX_OPTIONS, MAX_OPTION_VALUES, nextUid, type OptionDraft, type SectionErrors } from "../form-utils";

type OptionsEditorProps = {
  hasOptions: boolean;
  options: OptionDraft[];
  isEdit: boolean;
  errors: SectionErrors;
  onToggle: (on: boolean) => void;
  onChange: (options: OptionDraft[]) => void;
};

export function OptionsEditor({ hasOptions, options, isEdit, errors, onToggle, onChange }: OptionsEditorProps) {
  const update = (uid: string, patch: Partial<OptionDraft>) =>
    onChange(options.map((option) => (option.uid === uid ? { ...option, ...patch } : option)));

  return (
    <div className="space-y-5">
      <Checkbox
        label="This product comes in different options"
        description={
          isEdit
            ? "Options are chosen when a product is created and cannot be switched on or off later."
            : "For example size or color. Each combination gets its own SKU, price and stock."
        }
        checked={hasOptions}
        disabled={isEdit}
        onChange={(event) => onToggle(event.target.checked)}
      />

      {hasOptions && (
        <>
          {errors.options && (
            <p role="alert" className="text-sm text-danger">
              {errors.options}
            </p>
          )}

          {options.map((option, index) => (
            <div key={option.uid} className="space-y-4 rounded-lg border border-line bg-canvas/50 p-4">
              <div className="flex items-start gap-3">
                <Input
                  label={`Option ${index + 1} name`}
                  placeholder="Color"
                  maxLength={30}
                  value={option.name}
                  readOnly={option.locked}
                  hint={option.locked ? "Existing option names cannot be changed." : undefined}
                  error={errors.optionNames?.[option.uid]}
                  wrapperClassName="flex-1"
                  onChange={(event) => update(option.uid, { name: event.target.value })}
                />
                {!option.locked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-7 text-danger hover:bg-danger-soft"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() => onChange(options.filter((o) => o.uid !== option.uid))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              <TagInput
                label="Values"
                placeholder="Type a value and press Enter (Black, Blue…)"
                hint="Removing a value switches off its variants."
                values={option.values}
                max={MAX_OPTION_VALUES}
                error={errors.optionValues?.[option.uid]}
                onChange={(values) => update(option.uid, { values })}
              />
            </div>
          ))}

          {!isEdit && options.length < MAX_OPTIONS && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={() => onChange([...options, { uid: nextUid(), name: "", values: [], locked: false }])}
            >
              Add {options.length > 0 ? "another " : "an "}option
            </Button>
          )}
        </>
      )}
    </div>
  );
}