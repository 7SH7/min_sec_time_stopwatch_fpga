`timescale 1ns / 1ps

// 모드에 따라 FND 에 보낼 BCD 4자리 / dp / 애니메이션 패턴 선택
// fnd_controller 는 "숫자의 의미" 를 모르고, 여기서만 모드별 해석을 한다 (표시 계층 분리).
module display_mux (
    input      [2:0]  mode,
    input      [13:0] count,
    input      [7:0]  sw,
    input      [3:0]  sw_min_t,
    input      [3:0]  sw_min_o,
    input      [3:0]  sw_sec_t,
    input      [3:0]  sw_sec_o,
    input             sw_dot,
    input             sw_anim_en,
    input      [6:0]  sw_anim_seg,
    output reg [3:0]  d1000,
    output reg [3:0]  d100,
    output reg [3:0]  d10,
    output reg [3:0]  d1,
    output reg [3:0]  dp,
    output reg        anim_en,
    output reg [6:0]  anim_seg
);
    // mode_controller 와 같은 인코딩
    localparam IDLE      = 3'd0,
               UP        = 3'd1,
               DOWN      = 3'd2,
               SW_READ   = 3'd3,
               STOPWATCH = 3'd4;

    // 변환기는 하나만 두고 입력을 모드로 골라 넣는다 (나눗셈 회로 중복 방지)
    wire [13:0] w_bin = (mode == SW_READ) ? {6'b0, sw} : count;
    wire [3:0]  w_d1, w_d10, w_d100, w_d1000;

    bin2bcd4digit u_bin2bcd4digit (
        .seg_data(w_bin),
        .d1      (w_d1),
        .d10     (w_d10),
        .d100    (w_d100),
        .d1000   (w_d1000)
    );

    always @(*) begin
        // 기본값을 먼저 대입해 모든 경로에서 출력이 정해지도록 (래치 방지)
        d1000    = 4'd0;
        d100     = 4'd0;
        d10      = 4'd0;
        d1       = 4'd0;
        dp       = 4'b0000;
        anim_en  = 1'b0;
        anim_seg = 7'b0;
        case (mode)
            UP, DOWN, SW_READ: begin
                d1000 = w_d1000;
                d100  = w_d100;
                d10   = w_d10;
                d1    = w_d1;
            end
            STOPWATCH: begin
                d1000    = sw_min_t;
                d100     = sw_min_o;
                d10      = sw_sec_t;
                d1       = sw_sec_o;
                dp       = {1'b0, sw_dot, 2'b00};   // digit2(an[2]) = 분 1의 자리 오른쪽 점
                anim_en  = sw_anim_en;
                anim_seg = sw_anim_seg;
            end
            default: ;                              // IDLE : 0000 (기본값)
        endcase
    end
endmodule
