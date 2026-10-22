# Basys3 분초 스톱워치 (Verilog)

이전 과제(up/down 카운터)에 **스톱워치 모드**를 추가한 FPGA 프로젝트.
설계 상세는 [`docs/DESIGN.md`](docs/DESIGN.md), 원본 레퍼런스 코드는 [`refre/`](refre/) 에 있다.

> 이 문서는 "무엇을 만들었나"보다 **"어떻게 생각했고 어떤 순서로 만들었나"** 를 남기는 개발 일지다.
> 면접에서 설계 과정을 설명할 때 그대로 쓰는 것이 목적.

---

## 1. 과제 요구사항

```
분초시계 stopwatch 구현
 (1) circle 애니메이션: stopwatch 모드에서 일시정지 상태로 5초간 아무 버튼도 안 누르면 애니메이션,
     동작 버튼을 누르면 애니메이션 중지 후 해당 기능 수행
 (2) 분과 초 사이의 Dot 를 1초에 1번씩 깜박임
```

---

## 2. 어떻게 생각했나 (기획 단계)

### 2-1. 레퍼런스 코드부터 읽었다
새로 짜기 전에 `refre/` 의 5개 파일을 읽고 **재사용할 것 / 고칠 것** 을 나눴다.

| 파일 | 역할 | 판단 |
|------|------|------|
| `debouncer.v` | 2단 FF 동기화 + 10ms 안정 판정 | 그대로 재사용 (metastability 대응이 이미 올바름) |
| `tick_generator.v` | 100MHz → 1kHz 1클럭 펄스 | 그대로 재사용. "클럭 분주 대신 enable 펄스" 라는 원칙의 근간 |
| `fnd_controller.v` | 1ms 다이내믹 스캔 + bin→BCD + 7seg 디코더 | 구조는 유지, 인터페이스 확장 (BCD 직접 입력, dp, 애니메이션 override) |
| `main_controller.v` | 모드 FSM + 10ms 카운터 | **분리**: 모드 FSM 과 카운터를 별도 모듈로, 코딩 스타일 정리 |
| `top_up_down_controller.v` | 배선 | 새 top 으로 교체 |

레퍼런스에서 발견한 문제 (그대로 두면 합성 불가):
- top 이 `btn_debouncer`(3비트) 를 호출하지만 실제 파일엔 1비트 `debouncer` 만 있음 → 3개를 묶는 래퍼 모듈을 신설
- top 이 `main_controller` 의 존재하지 않는 `tick` 포트에 연결
- `r_mode = ...` 블로킹 대입, reset 분기 바깥의 `r_prev_btnL <= btn[0]`, `always @(r_mode)` 식 불완전 감도리스트
- `led` 가 두 always 블록에서 비트 나눠 구동

→ 이런 것들이 **"트러블슈팅" 슬라이드의 1차 재료**가 된다.

### 2-2. 요구사항을 "상태" 와 "시간" 으로 쪼갰다
스톱워치는 결국 **FSM(STOP / RUN / ANIM)** 과 **시간 파생(0.5s, 1s, 5s, 100ms)** 두 가지다.

- 시간은 전부 1kHz `tick` 을 세서 만든다. 100MHz 를 직접 세는 큰 카운터를 여러 개 두지 않는다.
  - 이유: 카운터 폭이 작아지고(20bit → 10~13bit), 모든 모듈이 같은 tick 기준이라 타이밍 차트 설명이 쉽다.
- FSM 은 **1클럭 폭 버튼 펄스** 만 본다. 디바운스 → 엣지 검출을 FSM 밖에서 끝낸다.
  - 이유: FSM 안에 "이전 버튼 값 기억" 같은 잡음이 섞이지 않고, 테스트벤치에서 펄스 하나로 전이를 검증할 수 있다.

### 2-3. 결정한 것들 (선택지와 이유)
| 결정 | 선택 | 대안 | 이유 |
|------|------|------|------|
| 모드 구조 | 기존 UP/DOWN/SW_READ 에 STOPWATCH 추가 | 스톱워치 단독 | 과제 문구가 "stopwatch mode" 라 모드 개념 전제. 계층 FSM(모드 FSM ⊃ 스톱워치 FSM) 설명 가능 |
| 버튼 | L=모드, C=시작/정지, R=클리어 | 다른 배치 | 레퍼런스의 btnL 모드 전환 유지 |
| 애니메이션 | 4자리 동시에 a→b→c→d→e→f 회전 | 뱀 모양, 위상차 | 구현 단순, "원이 돈다" 가 한눈에 보임 |
| dot | RUN: 0.5s ON/OFF, STOP: 켜짐, ANIM: 꺼짐 | 항상 깜박임 | 정지 중인지 눈으로 구분 가능 |
| 표시 인터페이스 | fnd_controller 가 BCD 4자리 + dp 를 받음 | MM*100+SS 를 2진수로 넘김 | 표시 모듈은 "숫자의 의미" 를 몰라야 재사용 가능 |
| 시뮬레이션 | 로컬 시뮬레이터 없음 → TB 는 파라미터 축소형으로 작성, Vivado xsim 에서 실행 | iverilog 설치 | 환경 제약 |

### 2-4. 개발 방식
- 기획/설계/리뷰는 사람 + 메인 에이전트가, **구현은 코드 특화 서브에이전트에게 위임**.
- 설계 문서(`docs/DESIGN.md`) 를 먼저 확정하고 그것을 구현 명세로 넘김. → "명세 없이 코드부터" 를 피함.
- 구현 후 별도 리뷰 에이전트가 코드를 검토 (작성자와 리뷰어 분리).

---

## 3. 어떤 흐름으로 개발했나 (진행 로그)

- [x] **Step 0** 레퍼런스 코드 분석, `refre/` 로 이동 (2026-10-22)
- [x] **Step 1** 요구사항 → 블록 다이어그램 / FSM / 모듈 명세 (`docs/DESIGN.md`)
- [x] **Step 2** 모듈 구현 (`src/` 11개) + 모듈별 자가판정 테스트벤치 (`sim/` 5개) + `constraints/Basys3.xdc` (2026-10-22, 구현 에이전트)
- [x] **Step 3** 코드 리뷰 (별도 리뷰 에이전트) → BLOCKER 0 / MAJOR 0 / MINOR 8. 반영 내용은 아래 3-1
- [ ] **Step 4** Vivado 에서 합성 / 시뮬레이션 / 타이밍 차트 캡처 / 보드 동작 영상 ← **다음 할 일**
- [x] **Step 5** 발표자료 27장: 원고(`ppt/OUTLINE.md`) → 다이어그램 13장(`ppt/assets/`, `node diagrams/build.js` 로 재생성) → `ppt/stopwatch_presentation.pptx` (`build_deck.js`). 렌더링 검사 2회(글자 크기 키움, 겹침 0). 영상·실제 파형 캡처·이름 7곳은 `{{...}}` 로 남김 (2026-10-22)
- [ ] **Step 6** Vivado 결과(TB 콘솔, 파형, Timing Summary, 보드 영상)를 PPT `{{...}}` 자리에 채우고 트러블슈팅 표 갱신

### 3-1. 리뷰에서 나온 것과 처리
| 지적 | 처리 |
|------|------|
| DESIGN.md 의 `led[13:0] = count` 가 모드 표시 `led[15:13]` 과 비트 겹침 | 문서를 `led[12:0]` 으로 수정 (코드는 처음부터 `[12:0]`) |
| clear 가 초 중간(`ms_cnt != 0`)에 눌린 경우가 TB 에 없음 | `tb_stopwatch` 에 "5 tick 진행 → 정지 → clear → 재시작 → 5 tick 뒤에도 00:00" 케이스 추가 |
| XDC 에 입출력 타이밍 제약이 없어 Vivado 경고 발생 | 동기화된 입력/느린 출력이므로 `set_false_path` 선언 |
| `tb_top_stopwatch` 의 clear 체크가 idle 타임아웃과 4 tick 차이로 아슬아슬 | 의존성 주석 추가 |
| 리셋(btnU) 해제 동기화 없음 | 미적용, DESIGN.md §7 "알려진 개선 여지" 에 기록 (Metastability 슬라이드 소재) |
| bin2bcd `/`,`%` 경로가 10ns 안에 못 들어올 가능성 | Vivado Timing Summary 확인 후 판단 (DESIGN.md §7) |

### 3-2. 검증 상태 (정직하게)
- 이 Mac 에는 Verilog 시뮬레이터/Vivado 가 없어 **컴파일도 시뮬레이션도 아직 한 번도 돌리지 않았다.**
- 대신 구현 에이전트와 리뷰 에이전트가 독립적으로 모든 포트 폭/인스턴스 연결/리셋/래치/감도리스트를 수동 점검했고, 리뷰어는 TB 의 기대값을 사이클 단위로 다시 계산해 일치함을 확인했다.
- 따라서 Vivado 에서 처음 할 일은 5개 TB 를 **Run All** 로 돌려 각각 `=== tb_xxx: 0 errors ===` 가 찍히는지 보는 것이다. (기본 run 시간 1000ns 는 너무 짧다. `sim/README.md` 참고)

### 3-3. Vivado 작업 순서
1. 새 프로젝트, 보드 Basys3 (xc7a35tcpg236-1)
2. Design Sources ← `src/*.v`, Simulation Sources ← `sim/*.v`, Constraints ← `constraints/Basys3.xdc`
3. 합성 top = `top_stopwatch`
4. 시뮬 top 을 `tb_stopwatch` 등으로 바꿔가며 Run All → 콘솔의 PASS/FAIL 확인, 파형에서 `sim/README.md` 의 5개 포인트 캡처
5. Generate Bitstream → 보드 다운로드 → btnL 로 모드 4(led[15:13]=100) 까지 이동 → btnC 시작/정지, btnR 클리어, 정지 후 5초 대기해 애니메이션 확인

## 4. 디렉터리

```
refre/        원본 레퍼런스 코드 (수정하지 않음)
docs/         설계 문서
src/          합성 대상 Verilog
sim/          테스트벤치
constraints/  Basys3 XDC
ppt/          발표자료. OUTLINE.md(원고) / diagrams/(그림 소스, build.js) / assets/(PNG) / build_deck.js / stopwatch_presentation.pptx
```

### 발표자료를 만든 방식
- 원고를 먼저 쓰고(슬라이드 텍스트 + 발표자 노트), 그림과 레이아웃은 원고에 맞춰 뒤에 만들었다. 슬라이드 문장은 원고 그대로이고 요약 bullet 로 바꾸지 않았다.
- 그림은 전부 코드(SVG/WaveDrom JSON → PNG)로 그려서 수정과 재생성이 가능하다. 글자 겹침·잘림은 렌더링한 PNG 를 눈으로 보고 고쳤다.
- 타이밍 차트 3장은 코드 동작을 기준으로 그린 "예상 파형"이다. Vivado xsim 캡처가 나오면 교체한다.
- 디자인은 흰 배경, 글자색 1종 + 보조 회색 1종 + 강조 빨강 1종(7세그먼트 색), 장식 요소 없음. 표지와 섹션 표지에만 7세그먼트 글리프를 둔다.
