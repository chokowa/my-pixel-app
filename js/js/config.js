export const PALETTES = {
    snes_classic_64: ['#000000','#101010','#212121','#313131','#424242','#525252','#636363','#737373','#848484','#949494','#A5A5A5','#B5B5B5','#C6C6C6','#D6D6D6','#E7E7E7','#FFFFFF','#3A1B0C','#522810','#753A17','#994E1F','#C26428','#EE7C33','#FF9A3E','#FFBB4D','#FFD963','#FFF98A','#E3F876','#C0EC64','#96DE54','#68CE45','#36BC36','#00A825','#009118','#00780A','#005F00','#004400','#002C00','#001600','#003D4D','#00556B','#00708D','#008FB3','#00ACE0','#00CCFF','#4DD9FF','#8DE9FF','#C3F6FF','#DEFDFD','#9B85C2','#7E68A6','#604D89','#42336B','#261B4F','#0E0033','#21004A','#380063','#53007E','#70009B','#9000BC','#B300E0','#D800FF','#FF00FF','#FF56FF','#FF98FF','#FFCCFF','#E9B4B4','#D49490','#BD726B','#A44F48','#8A2924','#6E0000'],
    famicom: ['#7C7C7C','#0000FC','#0000BC','#4428BC','#940084','#A80020','#A81000','#743800','#007800','#006800','#005800','#004058','#000000','#B80000','#008888','#00A800','#F8F8F8','#3CBCFC','#6888FC','#9878F8','#F878F8','#F85898','#F87858','#FCA044','#F8B800','#B8F818','#58D854','#58F898'],
    nes_standard: ['#7C7C7C','#0000FC','#0000BC','#4428BC','#940084','#A80020','#A81000','#881400','#503000','#007800','#006800','#005800','#004058','#000000','#000000','#000000','#BCBCBC','#0078F8','#0058F8','#6844FC','#D800CC','#E40058','#F83800','#E45C10','#AC7C00','#00B800','#00A800','#00A844','#008888','#000000','#000000','#000000','#F8F8F8','#3CBCFC','#6888FC','#9878F8','#F878F8','#F85898','#F87858','#FCA044','#F8B800','#B8F818','#58D854','#58F898','#00E8D8','#787878','#000000','#000000','#FFFFFF','#A4E4FC','#B8B8F8','#D8B8F8','#F8B8F8','#F8A4C0','#F0D0B0','#FCE0A8','#F8D878','#D8F878','#B8F8B8','#B8F8D8','#00FCFC','#F8D8F8','#000000','#000000'],
    nes_vibrant: ['#6B6B6B','#001B94','#10007A','#300078','#50005A','#5A0019','#4E0800','#341E00','#0E2E00','#003400','#00360A','#003239','#000000','#000000','#000000','#B9B9B9','#1859E1','#353EE3','#6328E0','#9A18C8','#A81079','#A02324','#7F3E00','#585600','#2C6900','#007100','#007218','#006C54','#000000','#000000','#000000','#FFFFFF','#6CAAFE','#8D8BFF','#B779FF','#F86BFF','#FF69C7','#FF7870','#E0973F','#BBAA0B','#7ECE0C','#40DA33','#38DE71','#3FFFF1','#000000','#000000','#000000'],
    gb_classic: ['#0F380F','#306230','#8BAC0F','#9BBC0F'],
    gb_pocket: ['#E0F8D0', '#88C070', '#346856', '#081820'],
    gb_sepia: ['#EADFC5', '#B3A261', '#7B673A', '#41341F'],
    cga: ['#000000','#0000AA','#00AA00','#00AAAA','#AA0000','#AA00AA','#AA5500','#AAAAAA','#555555','#5555FF','#55FF55','#55FFFF','#FF5555','#FF55FF','#FFFF55','#FFFFFF'],
    sega_ms: ['#000000','#0000AA','#00AA00','#00AAAA','#AA0000','#AA00AA','#AA5500','#AAAAAA','#555555','#5555FF','#55FF55','#55FFFF','#FF5555','#FF55FF','#FFFF55','#FFFFFF'],
    atari2600: ['#000000','#FFFFFF','#880000','#AAFFEE','#CC44CC','#00CC55','#0000AA','#EEEE77','#DD8855','#664400','#FF7777','#333333','#777777','#AAFF66','#0088FF','#BBBBBB']
};

export const PALETTE_PRESETS = {
    snes_classic_64: {dot:256, exposure:1.0, contrast:5, sharpen: 20, dither:40, paletteRatio:1.0},
    famicom: {dot:256, exposure:1.0, contrast:0, sharpen: 10, dither:30, paletteRatio:1.0},
    nes_standard: {dot:256, exposure:1.2, contrast:15, sharpen: 15, dither:25, paletteRatio:1.0},
    nes_vibrant: {dot:256, exposure:1.1, contrast:20, sharpen: 15, dither:30, paletteRatio:1.0},
    gb_classic: {dot:160, exposure:0.8, contrast:-20, sharpen: 25, dither:15, paletteRatio:1.0},
    gb_pocket: {dot:160, exposure:1.0, contrast:-10, sharpen: 20, dither:15, paletteRatio:1.0},
    gb_sepia: {dot:160, exposure:1.1, contrast:0, sharpen: 20, dither:15, paletteRatio:1.0},
    cga: {dot:320, exposure:1.0, contrast:0, sharpen: 0, dither:15, paletteRatio:1.0},
    sega_ms: {dot:256, exposure:1.0, contrast:10, sharpen: 10, dither:30, paletteRatio:1.0},
    atari2600: {dot:160, exposure:1.3, contrast:25, sharpen: 30, dither:30, paletteRatio:1.0}
};

export const PALETTE_GROUPS = [
    { name: "Nintendo Consoles", palettes: [ { id: "snes_classic_64", name: "SNES Classic (64)"}, { id: "nes_standard", name: "NES Standard (56)", isDefault: true}, { id: "nes_vibrant", name: "NES Vibrant (48)" }, { id: "famicom", name: "Famicom (28)" } ] },
    { name: "Game Boy", palettes: [ { id: "gb_classic", name: "GB Classic" }, { id: "gb_pocket", name: "GB Pocket" }, { id: "gb_sepia", name: "GB Sepia" } ] },
    { name: "Other Consoles & PCs", palettes: [ { id: "sega_ms", name: "Sega Master System" }, { id: "atari2600", name: "Atari 2600" }, { id: "cga", name: "IBM CGA" } ] }
];
