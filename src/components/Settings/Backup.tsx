import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { exportToJSON, type ExportData } from '../../utils/exportData'
import { importFromJSON, validateExportData } from '../../utils/importData'
import Modal from '../shared/Modal'

// ─── 백업 ─────────────────────────────────────────────────────────────────────

export default function Backup() {
  const [pending, setPending] = useState<{ data: ExportData; warning?: string } | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const notify = (text: string, ok: boolean) => setMessage({ text, ok })

  const handleExport = async () => {
    try {
      await exportToJSON()
      notify('백업 파일을 저장했어요.', true)
    } catch {
      notify('백업 파일을 만들지 못했어요.', false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    file
      .text()
      .then((text) => {
        const result = validateExportData(JSON.parse(text))
        if (!result.valid || !result.data) throw new Error('invalid')
        setPending({ data: result.data, warning: result.warning })
      })
      .catch(() => notify('일기 룰렛 백업 파일이 아닌 것 같아요.', false))
  }

  const confirmImport = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await importFromJSON(pending.data)
      setPending(null)
      notify('백업을 불러왔어요. 화면을 새로 고칠게요.', true)
      setTimeout(() => window.location.reload(), 1000)
    } catch {
      notify('백업을 불러오지 못했어요. 지금 데이터는 그대로예요.', false)
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleExport} className="btn-secondary">
          <Download className="h-4 w-4" />
          백업 파일 저장
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary">
          <Upload className="h-4 w-4" />
          백업 불러오기
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
      </div>

      {message && (
        <p role="status" className={`text-sm ${message.ok ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}

      <Modal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="백업을 불러올까요?"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setPending(null)} className="btn-secondary flex-1">
              취소
            </button>
            <button type="button" onClick={confirmImport} disabled={busy} className="btn-primary flex-1">
              {busy ? '불러오는 중…' : '불러오기'}
            </button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3 text-sm text-ink-mid">
            <p>
              백업 파일의 일기 <strong className="text-ink">{pending.data.journals.length}편</strong>으로 지금 데이터를 모두
              바꿔요. 지금 기기에만 있는 일기는 사라져요.
            </p>
            {pending.warning && <p className="rounded-lg bg-danger-soft px-3 py-2 text-danger">{pending.warning}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
