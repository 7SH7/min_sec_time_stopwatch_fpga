`timescale 1ns / 1ps

// 레벨 신호의 상승 엣지 → 1클럭 폭 펄스
// FSM 이 "버튼이 눌려 있는 동안" 이 아니라 "눌린 순간" 에 한 번만 반응하도록 만든다.
module edge_detector (
    input  clk,
    input  reset,
    input  level,
    output pulse
);
    reg level_d;    // 1클럭 전 값

    always @(posedge clk, posedge reset) begin
        if (reset)
            level_d <= 1'b0;
        else
            level_d <= level;
    end

    // level 이 레지스터 출력(clean_btn)이므로 이 AND 는 글리치 없이 정확히 1클럭 폭
    assign pulse = level & ~level_d;
endmodule
