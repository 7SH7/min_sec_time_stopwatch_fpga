`timescale 1ns / 1ps

// FND 4자리 다이내믹 스캔 컨트롤러 (refre/fnd_controller.v 확장)
// - 1ms tick 마다 한 자리씩 켜서 4ms 주기(250Hz) 로 돌면 잔상 효과로 4자리가 동시에 보인다.
// - 입력은 BCD 4자리 + dp 4비트 + 애니메이션 패턴뿐 (숫자 해석은 display_mux 담당).
// - an/seg 를 FF 로 한 번 더 받아 출력 → 조합 로직 글리치가 핀으로 나가지 않는다 (1클럭 지연은 무시 가능).
module fnd_controller (
    input            clk,
    input            reset,
    input            tick,
    input      [3:0] d1000,
    input      [3:0] d100,
    input      [3:0] d10,
    input      [3:0] d1,
    input      [3:0] dp,         // dp[i] = 1 이면 i 번째 자리 점 켜짐
    input            anim_en,
    input      [6:0] anim_seg,   // {g,f,e,d,c,b,a} active-high
    output reg [3:0] an,         // active-low
    output reg [7:0] seg         // {dp,g,f,e,d,c,b,a} active-low
);
    wire [1:0] w_sel;
    wire [3:0] w_an;
    wire [7:0] w_seg;

    fnd_digit_select u_fnd_digit_select (
        .clk  (clk),
        .reset(reset),
        .tick (tick),
        .sel  (w_sel)
    );

    fnd_digit_display u_fnd_digit_display (
        .sel     (w_sel),
        .d1      (d1),
        .d10     (d10),
        .d100    (d100),
        .d1000   (d1000),
        .dp      (dp),
        .anim_en (anim_en),
        .anim_seg(anim_seg),
        .an      (w_an),
        .seg     (w_seg)
    );

    // 출력 레지스터 : 리셋 시 모든 자리/세그먼트 꺼짐 (active-low 이므로 1)
    always @(posedge clk, posedge reset) begin
        if (reset) begin
            an  <= 4'b1111;
            seg <= 8'hFF;
        end
        else begin
            an  <= w_an;
            seg <= w_seg;
        end
    end
endmodule

// --- 1ms 마다 표시할 자리를 하나씩 선택 (00→01→10→11→00) ---
module fnd_digit_select (
    input            clk,
    input            reset,
    input            tick,
    output reg [1:0] sel
);
    always @(posedge clk, posedge reset) begin
        if (reset)
            sel <= 2'd0;
        else if (tick)
            sel <= sel + 2'd1;      // 2bit 오버플로로 자연스럽게 0 으로 돌아감
    end
endmodule

// --- 선택된 자리의 an / seg 생성 (순수 조합) ---
module fnd_digit_display (
    input      [1:0] sel,
    input      [3:0] d1,
    input      [3:0] d10,
    input      [3:0] d100,
    input      [3:0] d1000,
    input      [3:0] dp,
    input            anim_en,
    input      [6:0] anim_seg,
    output reg [3:0] an,
    output reg [7:0] seg
);
    reg [3:0] bcd_data;
    reg       dp_bit;
    reg [6:0] seg7;          // {g,f,e,d,c,b,a} active-low

    // 자리 선택 : an[0]=일의 자리 ... an[3]=천의 자리
    always @(*) begin
        case (sel)
            2'b00:   begin bcd_data = d1;    dp_bit = dp[0]; an = 4'b1110; end
            2'b01:   begin bcd_data = d10;   dp_bit = dp[1]; an = 4'b1101; end
            2'b10:   begin bcd_data = d100;  dp_bit = dp[2]; an = 4'b1011; end
            2'b11:   begin bcd_data = d1000; dp_bit = dp[3]; an = 4'b0111; end
            default: begin bcd_data = 4'd0;  dp_bit = 1'b0;  an = 4'b1111; end
        endcase
    end

    // 7세그먼트 디코더 (레퍼런스의 always @(bcd_data) 불완전 감도리스트 → always @(*))
    always @(*) begin
        case (bcd_data)
            4'd0:    seg7 = 7'b1000000;
            4'd1:    seg7 = 7'b1111001;
            4'd2:    seg7 = 7'b0100100;
            4'd3:    seg7 = 7'b0110000;
            4'd4:    seg7 = 7'b0011001;
            4'd5:    seg7 = 7'b0010010;
            4'd6:    seg7 = 7'b0000010;
            4'd7:    seg7 = 7'b1111000;
            4'd8:    seg7 = 7'b0000000;
            4'd9:    seg7 = 7'b0010000;
            default: seg7 = 7'b1111111;     // BCD 가 아니면 전부 끔
        endcase
    end

    // 애니메이션이면 숫자 대신 패턴을 4자리 모두에 동일 출력 (스캔은 그대로 → 밝기 동일)
    always @(*) begin
        if (anim_en)
            seg = {1'b1, ~anim_seg};
        else
            seg = {~dp_bit, seg7};
    end
endmodule
