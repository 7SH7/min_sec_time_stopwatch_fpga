`timescale 1ns / 1ps

// 버튼 3개 각각에 debouncer + edge_detector 를 붙인 묶음
// (레퍼런스 top 이 호출했지만 실제로는 없던 모듈을 신설)
// 출력은 "눌린 순간" 1클럭 펄스 → 이후 모든 FSM 은 이 펄스만 본다.
module btn_debouncer #(parameter DEBOUNCE_LIMIT = 999_999) (
    input        clk,
    input        reset,
    input  [2:0] noisy_btn,
    output [2:0] btn_pulse
);
    genvar i;
    generate
        for (i = 0; i < 3; i = i + 1) begin : g_btn
            wire w_clean;

            debouncer #(.DEBOUNCE_LIMIT(DEBOUNCE_LIMIT)) u_debouncer (
                .clk      (clk),
                .reset    (reset),
                .noisy_btn(noisy_btn[i]),
                .clean_btn(w_clean)
            );

            edge_detector u_edge_detector (
                .clk  (clk),
                .reset(reset),
                .level(w_clean),
                .pulse(btn_pulse[i])
            );
        end
    endgenerate
endmodule
