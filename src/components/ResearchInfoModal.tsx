import React from 'react';
import { X, BookOpen, Award, CheckCircle, Cpu, ShieldCheck } from 'lucide-react';

interface ResearchInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResearchInfoModal: React.FC<ResearchInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-[#DEDECF] rounded-[32px] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 text-[#2D2D24]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F0F0E8] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#F5F5F0] text-[#5A5A40] border border-[#DEDECF] rounded-2xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#2D2D24]">
                임상 및 학술 이론 배경 (Clinical & Literature Background)
              </h2>
              <p className="text-xs text-[#8A8A70]">
                MediaPipe Pose 기반 무릎 관절 각도 추정 및 검증 선행 연구
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-[#F5F5F0] hover:bg-[#E8E8DF] text-[#5A5A40] border border-[#DEDECF] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: MediaPipe 6 Lower Body Landmarks */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#FF6321] uppercase tracking-wider flex items-center space-x-2">
            <Cpu className="w-4 h-4" />
            <span>1. MediaPipe Pose 33개 랜드마크 중 하체 6개 선별</span>
          </h3>
          <p className="text-xs text-[#5A5A40] leading-relaxed pl-3 border-l-2 border-[#FF6321]">
            본 웹앱은 MediaPipe Pose가 제공하는 33개 관절 키포인트 중 하체 운동 및 보행 분석에 핵심적인 6개 랜드마크(23: 좌측 고관절, 24: 우측 고관절, 25: 좌측 슬관절, 26: 우측 슬관절, 27: 좌측 족관절, 28: 우측 족관절)를 추출하여 정규화 좌표(x, y), 상대 깊이(z), 신뢰도(visibility)를 실시간 계산합니다.
          </p>
        </div>

        {/* Section 2: Clinical Gait Criteria & Stiff Knee Gait */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#FF6321]" />
            <span>2. 보행 주기 및 뻣뻣한 무릎 보행(Stiff Knee Gait) 판정 기준</span>
          </h3>
          <div className="bg-[#FDFDFB] p-4 rounded-2xl border border-[#F0F0E8] text-xs space-y-2">
            <div className="flex items-start space-x-2">
              <span className="font-bold text-[#2D2D24]">초기 접지 (Initial Contact):</span>
              <span className="text-[#8A8A70]">무릎 관절 각도 약 0° (완전 신전)</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-[#2D2D24]">유각기 (Swing Phase):</span>
              <span className="text-[#8A8A70]">발이 지면에서 떨어질 때 무릎 관절 각도 약 62° 굴곡</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-[#FF6321]">뻣뻣한 무릎 보행 (Stiff Knee Gait):</span>
              <span className="text-[#5A5A40]">
                유각기 굴곡이 45° 미만으로 제한되는 현상. 슬괵근 경직, 하퇴삼두근 약화, 뇌성마비, 수술 후 연골연화증 주요 원인.
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-[#5A5A40]">TKA 재활 가동범위 목표:</span>
              <span className="text-[#5A5A40]">슬관절 전치환술 후 신전 0°, 굴곡 120° 이상 확보</span>
            </div>
          </div>
        </div>

        {/* Section 3: Preceding Literature & Reliability Validation */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center space-x-2">
            <Award className="w-4 h-4 text-[#FF6321]" />
            <span>3. 선행 연구 및 검증 알고리즘 (uDEAS & Low-cost Webcam)</span>
          </h3>
          <ul className="text-xs text-[#5A5A40] space-y-2 list-disc pl-5">
            <li>
              <strong>휴머노이드 로봇 관절 검증 (uDEAS 알고리즘):</strong> 실제 관절 각도를 정확히 아는 휴머노이드 로봇의 시상면·관상면 각도를 MediaPipe 좌표 및 전역최적화 알고리즘(uDEAS)으로 추출·비교하여 정확도와 정량적 신뢰성을 검증하였습니다.
            </li>
            <li>
              <strong>국내 연구 (MediaPipe + OpenCV + LSTM):</strong> 저비용 단일 웹캠과 오픈소스 라이브러리만으로 실시간 포즈 및 보행 제스처 인식이 고가의 분석 장비 대비 높은 정확도를 보임을 입증하였습니다.
            </li>
          </ul>
        </div>

        {/* Section 4: Academic References */}
        <div className="space-y-2 border-t border-[#F0F0E8] pt-4">
          <h4 className="text-xs font-bold text-[#8A8A70] uppercase tracking-wider">
            참고 문헌 (References)
          </h4>
          <ol className="text-[11px] text-[#8A8A70] space-y-1.5 list-decimal pl-4 font-mono">
            <li>Pose landmark detection guide, Google AI Edge, Google for Developers.</li>
            <li>Knee Flexion/Extension Angle Measurement for Gait Analysis Using Machine Learning Solution "MediaPipe Pose" and Its Comparison with Kinovea, ResearchGate.</li>
            <li>MediaPipe Pose 정리: 사람 자세추적, velog.</li>
          </ol>
        </div>

        {/* Footer Close */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md"
          >
            확인 및 닫기
          </button>
        </div>

      </div>
    </div>
  );
};
