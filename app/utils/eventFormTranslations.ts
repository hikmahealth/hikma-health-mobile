import EventForm from "@/models/EventForm"

import { getTranslation } from "./parsers"

/** Unwrap an Effect Option<T> or a plain value to T | undefined, without importing Effect */
function unwrapOption<T>(value: unknown): T | undefined {
  if (value == null) return undefined
  if (typeof value === "object" && "_tag" in (value as object)) {
    const tagged = value as { _tag: string; value?: T }
    return tagged._tag === "Some" ? tagged.value : undefined
  }
  return value as T
}

export type ResolvedFormTranslations = {
  formName: string
  formDescription: string
  fieldNames: Record<string, string>
  fieldDescriptions: Record<string, string>
  optionLabels: Record<string, Record<string, string>>
}

/**
 * Get the lookup key for a field option translation.
 * Uses the option's id if available, otherwise falls back to the option's value.
 */
export function getOptionId(option: { id?: string; value: string }): string {
  return option.id ?? option.value
}

/**
 * Resolve all translations for a form given the user's language.
 * Falls back to the form's original text (field.name, option.label, form.name/description)
 * when no translation is available.
 */
export function resolveFormTranslations(
  form: {
    name: string
    description: string
    formFields: EventForm.FieldItem[]
    translations?: EventForm.FieldTranslation[]
  },
  language: string,
): ResolvedFormTranslations {
  const translations = form.translations ?? []

  // Resolve form-level name
  const formNameEntry = translations.find((t) => t.fieldId === EventForm.FORM_NAME_FIELD_ID)
  const formName =
    formNameEntry && Object.keys(formNameEntry.name).length > 0
      ? getTranslation(formNameEntry.name, language)
      : form.name

  // Resolve form-level description
  const formDescEntry = translations.find((t) => t.fieldId === EventForm.FORM_DESCRIPTION_FIELD_ID)
  const formDescription =
    formDescEntry && Object.keys(formDescEntry.description).length > 0
      ? getTranslation(formDescEntry.description, language)
      : formDescEntry && Object.keys(formDescEntry.name).length > 0
        ? getTranslation(formDescEntry.name, language)
        : form.description

  // Resolve field-level translations
  const fieldNames: Record<string, string> = {}
  const fieldDescriptions: Record<string, string> = {}
  const optionLabels: Record<string, Record<string, string>> = {}

  for (const field of form.formFields) {
    const entry = translations.find((t) => t.fieldId === field.id)

    // Field name
    if (entry && Object.keys(entry.name).length > 0) {
      fieldNames[field.id] = getTranslation(entry.name, language)
    } else {
      fieldNames[field.id] = field.name
    }

    // Field description
    if (entry && Object.keys(entry.description).length > 0) {
      fieldDescriptions[field.id] = getTranslation(entry.description, language)
    }

    // Option labels
    if (entry && Object.keys(entry.options).length > 0) {
      const options = unwrapOption<any[]>(field.options) ?? []

      const resolved: Record<string, string> = {}
      for (const option of options) {
        if (typeof option === "string") continue // skip medicine string options
        const key = getOptionId(option)
        const translationObj = entry.options[key]
        if (translationObj && Object.keys(translationObj).length > 0) {
          resolved[key] = getTranslation(translationObj, language)
        } else {
          resolved[key] = option.label
        }
      }
      optionLabels[field.id] = resolved
    }
  }

  return {
    formName,
    formDescription,
    fieldNames,
    fieldDescriptions,
    optionLabels,
  }
}
