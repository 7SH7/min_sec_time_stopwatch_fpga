`timescale 1ns / 1ps

// Basys3 최상위 : 버튼 → 디바운스/펄스 → 모드/카운터/스톱워치 → 표시 선택 → FND 스캔
// 타이밍 파라미터를 모두 top 으로 노출 → TB 에서 값을 줄여 수 ms 시뮬레이션으로 전체 검증
module top_stopwatch #(
    parameter DEBOUNCE_LIMIT  = 999_999,       // 10ms @100MHz
    parameter INPUT_FREQ      = 100_000_000,
    parameter TICK_HZ         = 1000,          // 1kHz tick
    parameter TICKS_PER_STEP  = 10,            // 업/다운 카운터 10ms
    parameter TICKS_PER_SEC   = 1000,
    parameter IDLE_TIMEOUT_S  = 5,
    parameter ANIM_STEP_TICKS = 100
)(
    input             clk,
    input             reset,       // btnU, active-high
    input      [2:0]  btn,         // [0]=btnL 모드, [1]=btnC 시작/정지, [2]=btnR 클리어
    input      [7:0]  sw,
    output     [3:0]  an,
    output     [7:0]  seg,
    output reg [15:0] led
);
    // mode_controller 와 같은 인코딩
    localparam IDLE      = 3'd0,
               UP        = 3'd1,
               DOWN      = 3'd2,
               SW_READ   = 3'd3,
               STOPWATCH = 3'd4;

    wire [2:0]  w_btn_pulse;
    wire        w_tick;
    wire [2:0]  w_mode;
    wire [13:0] w_count;
    wire [3:0]  w_min_t, w_min_o, w_sec_t, w_sec_o;
    wire        w_dot, w_anim_en;
    wire [6:0]  w_anim_seg;
    wire [1:0]  w_sw_state;
    wire [3:0]  w_d1000, w_d100, w_d10, w_d1, w_dp;
    wire        w_fnd_anim_en;
    wire [6:0]  w_fnd_anim_seg;

    wire w_active = (w_mode == STOPWATCH);

    btn_debouncer #(.DEBOUNCE_LIMIT(DEBOUNCE_LIMIT)) u_btn_debouncer (
        .clk      (clk),
        .reset    (reset),
        .noisy_btn(btn),
        .btn_pulse(w_btn_pulse)
    );

    tick_generator #(.INPUT_FREQ(INPUT_FREQ), .TICK_HZ(TICK_HZ)) u_tick_generator (
        .clk  (clk),
        .reset(reset),
        .tick (w_tick)
    );

    mode_controller u_mode_controller (
        .clk           (clk),
        .reset         (reset),
        .btn_mode_pulse(w_btn_pulse[0]),
        .mode          (w_mode)
    );

    up_down_counter #(.TICKS_PER_STEP(TICKS_PER_STEP)) u_up_down_counter (
        .clk    (clk),
        .reset  (reset),
        .tick   (w_tick),
        .en_up  (w_mode == UP),
        .en_down(w_mode == DOWN),
        .count  (w_count)
    );

    stopwatch #(
        .TICKS_PER_SEC  (TICKS_PER_SEC),
        .IDLE_TIMEOUT_S (IDLE_TIMEOUT_S),
        .ANIM_STEP_TICKS(ANIM_STEP_TICKS)
    ) u_stopwatch (
        .clk      (clk),
        .reset    (reset),
        .tick     (w_tick),
        .active   (w_active),
        .btn_run  (w_btn_pulse[1]),
        .btn_clear(w_btn_pulse[2]),
        .btn_other(w_btn_pulse[0]),
        .min_tens (w_min_t),
        .min_ones (w_min_o),
        .sec_tens (w_sec_t),
        .sec_ones (w_sec_o),
        .dot      (w_dot),
        .anim_en  (w_anim_en),
        .anim_seg (w_anim_seg),
        .state    (w_sw_state)
    );

    display_mux u_display_mux (
        .mode       (w_mode),
        .count      (w_count),
        .sw         (sw),
        .sw_min_t   (w_min_t),
        .sw_min_o   (w_min_o),
        .sw_sec_t   (w_sec_t),
        .sw_sec_o   (w_sec_o),
        .sw_dot     (w_dot),
        .sw_anim_en (w_anim_en),
        .sw_anim_seg(w_anim_seg),
        .d1000      (w_d1000),
        .d100       (w_d100),
        .d10        (w_d10),
        .d1         (w_d1),
        .dp         (w_dp),
        .anim_en    (w_fnd_anim_en),
        .anim_seg   (w_fnd_anim_seg)
    );

    fnd_controller u_fnd_controller (
        .clk     (clk),
        .reset   (reset),
        .tick    (w_tick),
        .d1000   (w_d1000),
        .d100    (w_d100),
        .d10     (w_d10),
        .d1      (w_d1),
        .dp      (w_dp),
        .anim_en (w_fnd_anim_en),
        .anim_seg(w_fnd_anim_seg),
        .an      (an),
        .seg     (seg)
    );

    // LED : [15:13] = 현재 모드, 나머지는 모드별 데이터
    // (카운터는 14bit 지만 [13] 은 모드 표시와 겹치므로 [12:0] 만 표시)
    always @(*) begin
        led        = 16'b0;
        led[15:13] = w_mode;
        case (w_mode)
            UP, DOWN:  led[12:0] = w_count[12:0];
            SW_READ:   led[7:0]  = sw;
            STOPWATCH: led[1:0]  = w_sw_state;
            default:   led[12:0] = 13'b0;
        endcase
    end
endmodule
