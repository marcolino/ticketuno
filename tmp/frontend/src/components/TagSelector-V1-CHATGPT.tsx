import React, { useEffect, useState } from "react"
import {
  Box,
  Chip,
  Stack,
  TextField,
  Typography
} from "@mui/material"
import { useTranslation } from "react-i18next"

type Props = {
  storageKey: string
  label: string
  value: string[]
  onChange: (value: string[]) => void
  defaultOptions?: string[]
}

const TagSelector = ({
  storageKey,
  label,
  value,
  onChange,
  defaultOptions = []
}: Props) => {
  const { t } = useTranslation()

  const [options, setOptions] = useState<string[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)

    if (saved) {
      setOptions(JSON.parse(saved))
    } else {
      setOptions(defaultOptions)
    }
  }, [storageKey, defaultOptions])

  const saveOptions = (newOptions: string[]) => {
    setOptions(newOptions)
    localStorage.setItem(storageKey, JSON.stringify(newOptions))
  }

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return

    if (!value.includes(trimmed)) {
      const newValue = [...value, trimmed]
      onChange(newValue)
    }

    if (!options.includes(trimmed)) {
      saveOptions([...options, trimmed])
    }

    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(v => v !== tag))
  }

  const toggleTag = (tag: string) => {
    if (value.includes(tag)) {
      removeTag(tag)
    } else {
      addTag(tag)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(input)
    }
  }

  const suggestions = options.filter(o => !value.includes(o))

  return (
    <Stack spacing={1.5} width='100%'>
      <TextField
        label={t(label)}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('typeAndPressEnter')}
        fullWidth
        size='small'
      />

      {value.length > 0 && (
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {t('selected')}
          </Typography>

          <Stack
            direction='row'
            flexWrap='wrap'
            gap={1}
            mt={0.5}
          >
            {value.map(tag => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => removeTag(tag)}
                color='primary'
                size='small'
              />
            ))}
          </Stack>
        </Box>
      )}

      {suggestions.length > 0 && (
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {t('suggestions')}
          </Typography>

          <Stack
            direction='row'
            flexWrap='wrap'
            gap={1}
            mt={0.5}
          >
            {suggestions.map(tag => (
              <Chip
                key={tag}
                label={tag}
                onClick={() => toggleTag(tag)}
                variant='outlined'
                size='small'
              />
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  )
};

export default TagSelector;
