'use client'

interface ParameterControlsProps {
  prevalence: number
  sensitivity: number
  specificity: number
  onPrevalenceChange: (v: number) => void
  onSensitivityChange: (v: number) => void
  onSpecificityChange: (v: number) => void
  onSliderDragStart: (param: string, value: number) => void
  onSliderDragEnd: (param: string, value: number) => void
  disabled?: boolean
}

interface SliderProps {
  label: string
  paramKey: string
  notation: string
  value: number
  min: number
  max: number
  step: number
  ticks: string[]
  format: (v: number) => string
  onChange: (v: number) => void
  onDragStart: (param: string, value: number) => void
  onDragEnd: (param: string, value: number) => void
  disabled?: boolean
}

function ParamSlider({ label, paramKey, notation, value, min, max, step, ticks, format, onChange, onDragStart, onDragEnd, disabled }: SliderProps) {
  return (
    <div className="param-group">
      <div className="param-header">
        <span className="param-name">{label}</span>
        <span className="param-notation">{notation}</span>
      </div>
      <div className="param-value-display">{format(value)}</div>
      <input
        type="range"
        className="param-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value))}
        onPointerDown={() => onDragStart(paramKey, value)}
        onPointerUp={() => onDragEnd(paramKey, value)}
        onPointerCancel={() => onDragEnd(paramKey, value)}
      />
      <div className="param-ticks">
        {ticks.map(t => <span key={t}>{t}</span>)}
      </div>
    </div>
  )
}

const pct = (v: number) => `${Math.round(v * 100)}%`

export default function ParameterControls(props: ParameterControlsProps) {
  return (
    <div className="params-col">
      <ParamSlider
        label="Prevalence"
        paramKey="prevalence"
        notation="P(D)"
        value={props.prevalence}
        min={0.001}
        max={0.2}
        step={0.001}
        ticks={['0.1%', '1%', '5%', '10%', '20%']}
        format={pct}
        onChange={props.onPrevalenceChange}
        onDragStart={props.onSliderDragStart}
        onDragEnd={props.onSliderDragEnd}
        disabled={props.disabled}
      />
      <ParamSlider
        label="Sensitivity"
        paramKey="sensitivity"
        notation="P(+ | D)"
        value={props.sensitivity}
        min={0.5}
        max={1}
        step={0.01}
        ticks={['50%', '70%', '90%', '99%']}
        format={pct}
        onChange={props.onSensitivityChange}
        onDragStart={props.onSliderDragStart}
        onDragEnd={props.onSliderDragEnd}
        disabled={props.disabled}
      />
      <ParamSlider
        label="Specificity"
        paramKey="specificity"
        notation="P(− | ¬D)"
        value={props.specificity}
        min={0.5}
        max={1}
        step={0.01}
        ticks={['50%', '70%', '90%', '99%']}
        format={pct}
        onChange={props.onSpecificityChange}
        onDragStart={props.onSliderDragStart}
        onDragEnd={props.onSliderDragEnd}
        disabled={props.disabled}
      />
    </div>
  )
}
