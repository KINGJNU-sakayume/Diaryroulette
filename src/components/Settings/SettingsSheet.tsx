import Modal from '../shared/Modal'
import Section from '../shared/Section'
import { LifeHubSettings } from '../LifeHub/LifeHub'
import Backup from './Backup'

/** 헤더 톱니 버튼으로 여는 설정: Life Hub → 백업 */
export default function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="설정">
      <div className="space-y-4">
        <Section title="Life Hub">
          <LifeHubSettings />
        </Section>
        <Section title="백업" description="일기는 이 기기의 브라우저에만 저장돼요. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 파일로 백업해 두세요.">
          <Backup />
        </Section>
      </div>
    </Modal>
  )
}
