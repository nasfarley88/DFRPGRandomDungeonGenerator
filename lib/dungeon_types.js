﻿// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// dungeon.js // version 1.0.3
//
// written by drow <drow@bin.sh>
// http://creativecommons.org/licenses/by-nc/3.0/

var pixels = 25;

function get_pixels()
{
    return pixels;
}

/**
 * space content "Enum" values
 */
var
    NOTHING     = 0,
    BLOCKED     = 1,        // 0000 0000 0000 0000 0000 0000 0000 0001
    ROOM        = 2,        // 0000 0000 0000 0000 0000 0000 0000 0010
    CORRIDOR    = 4,        // 0000 0000 0000 0000 0000 0000 0000 0100
    // 8 reserved
    PERIMETER   = 16,       // 0000 0000 0000 0000 0000 0000 0001 0000
    ENTRANCE    = 32,       // 0000 0000 0000 0000 0000 0000 0010 0000
    // 64 reserved
    // 128 reserved
    ROOM_ID     = 256,      // 0000 0000 0000 0000 0000 0001 0000 0000
    LABEL       = 512,      // ‭0000 0000 0000 0000 0000 0010 0000 0000‬
    // 1024 reserved
    // 2048 reserved
    STAIR_DN    = 4096,     // 0000 0000 0000 0000 0001 0000 0000 0000
    STAIR_UP    = 8192,     // 0000 0000 0000 0000 0010 0000 0000 0000
    // ‭16384‬ reserved
    // ‭32768‬ reserved
    ARCH        = 65536,    // 0000 0000 0000 0001 0000 0000 0000 0000
    DOOR        = 131072,   // 0000 0000 0000 0010 0000 0000 0000 0000
    LOCKED      = 262144,   // 0000 0000 0000 0100 0000 0000 0000 0000
    TRAPPED     = 524288,   // 0000 0000 0000 1000 0000 0000 0000 0000
    SECRET      = 1048576,  // 0000 0000 0001 0000 0000 0000 0000 0000
    PORTC       = 2097152,  // 0000 0000 0010 0000 0000 0000 0000 0000
    STUCK       = 4194304,  // 0000 0000 0100 0000 0000 0000 0000 0000
    OPENSPACE   = ROOM | CORRIDOR,
    DOORSPACE   = ARCH | DOOR | LOCKED | TRAPPED | SECRET | PORTC | STUCK,
    DOORTABLE   = DOOR | LOCKED | TRAPPED | SECRET | STUCK,
    PLAYERWALL  = NOTHING | SECRET,
    PLAYERDOOR  = DOOR | TRAPPED | LOCKED | STUCK,

    ESPACE      = ENTRANCE | DOORSPACE | LABEL,
    STAIRS      = STAIR_DN | STAIR_UP,
    BLOCK_ROOM  = BLOCKED | ROOM,
    BLOCK_CORR  = BLOCKED | PERIMETER | CORRIDOR,
    BLOCK_DOOR  = BLOCKED | DOORSPACE;

/**
 * Directions north-south
 */
var di = {
    north: -1,
    south: 1,
    west: 0,
    east: 0
};
/**
 * directions east-west
 */
var dj = {
    north: 0,
    south: 0,
    west: -1,
    east: 1
};
var dj_dirs = $H(dj).keys().sort();
/**
 * Find opposite of the given direction
 */
var opposite = {
    north: "south",
    south: "north",
    west: "east",
    east: "west"
};

var door_types = {
    ARCH: {
        mask: ARCH,
        key: "arch",
        type: "Archway"
    },
    DOOR: {
        mask: DOOR,
        key: "open",
        type: "Door"
    },
    LOCKED: {
        mask: LOCKED,
        key: "lock",
        type: "Locked"
    },
    STUCK: {
        mask: STUCK,
        key: "lock",
        type: "Stuck"
    },
    TRAPPED: {
        mask: TRAPPED,
        key: "trap",
        type: "Trapped"
    },
    SECRET: {
        mask: SECRET,
        key: "secret",
        type: "Secret"
    },
    PORTC: {
        mask: PORTC,
        key: "portc",
        type: "Portcullis"
    }
};


/**
 * Dungeon data set JSON construct
 */
var dungeon_options = {
    map_style: {
        standard: {
            title: "Standard"
        },
        three_d_se: {
             title: "3D SE"
        },
        three_d_nw: {
             title: "3D NW"
        },
        ink_miser: {
            title: "Ink Miser"
        },
        classic: {
            title: "Classic"
        },
        graph: {
            title: "GraphPaper"
        }
    },
    grid: {
        none: {
            title: "None"
        },
        square: {
            title: "Square"
        },
        hex: {
            title: "Hex"
        },
        vex: {
            title: "VertHex"
        }
    },
    dungeon_layout: {
        square: {
            title: "Square",
            aspect: 1
        },
        rectangle: {
            title: "Rectangle",
            aspect: 1.3
        },
        box: {
            title: "Box",
            aspect: 1,
            mask: [
                [1, 1, 1],
                [1, 0, 1],
                [1, 1, 1]
            ]
        },
        cross: {
            title: "Cross",
            aspect: 1,
            mask: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 1, 0]
            ]
        },
        box: {
            title: "L",
            aspect: 2,
            mask: [
                [1, 0],
                [1, 0],
                [1, 1],
                [1, 1]
            ]
        },
        dagger: {
            title: "Dagger",
            aspect: 1.3,
            mask: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 1, 0],
                [0, 1, 0]
            ]
        },
        saltire: {
            title: "Saltire",
            aspect: 1
        },
        triangle: {
            title: "Triangle",
            aspect: 1,
            mask: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
                [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
                [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],

            ]
        },
        pyramid: {
            title: "Pyramid",
            aspect: 1,
            mask: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
                [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
                [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ]
        },
        keep: {
            title: "Keep",
            aspect: 1,
            mask: [
                [1, 1, 0, 0, 1, 1],
                [1, 1, 1, 1, 1, 1],
                [0, 1, 1, 1, 1, 0],
                [0, 1, 1, 1, 1, 0],
                [1, 1, 1, 1, 1, 1],
                [1, 1, 0, 0, 1, 1]
            ]
        },
        hexagon: {
            title: "Hexagon",
            aspect: 0.9
        },
        round: {
            title: "Round",
            aspect: 1
        }
    },
    dungeon_size: {
        fine: {
            title: "Fine",
            size: 11,
            cell: get_pixels
        },
        dimin: {
            title: "Diminiutive",
            size: 15,
            cell: get_pixels
        },
        tiny: {
            title: "Tiny",
            size: 19,
            cell: get_pixels
        },
        small: {
            title: "Small",
            size: 23,
            cell: get_pixels
        },
        medium: {
            title: "Medium",
            size: 504/18,
            cell: get_pixels
        },
        large: {
            title: "Large",
            size: 35,
            cell: get_pixels
        },
        huge: {
            title: "Huge",
            size: 45,
            cell: get_pixels
        },
        gargant: {
            title: "Gargantuan",
            size: 61,
            cell: get_pixels
        },
        colossal: {
            title: "Colossal",
            size: 75,
            cell: get_pixels
        }
    },
    add_stairs: {
        no: {
            title: "No"
        },
        yes: {
            title: "Yes"
        },
        many: {
            title: "Many"
        }
    },
    room_layout: {
        sparse: {
            title: "Sparse"
        },
        scattered: {
            title: "Scattered"
        },
        tight: {
            title: "Tight"
        },
        dense: {
            title: "Dense"
        }
    },
    room_size: {
        tiny: {
            index: 0,
            title: "Tiny",
            size: 2,
            radix: 1
        },
        small: {
            index: 1,
            title: "Small",
            size: 2,
            radix: 2
        },
        medium: {
            index: 2,
            title: "Medium",
            size: 2,
            radix: 5
        },
        large: {
            index: 3,
            title: "Large",
            size: 5,
            radix: 2
        },
        huge: {
            index: 4,
            title: "Huge",
            size: 5,
            radix: 5,
            huge: 1
        },
        gargant: {
            index: 5,
            title: "Gargantuan",
            size: 8,
            radix: 5,
            huge: 1
        },
        colossal: {
            index: 6,
            title: "Colossal",
            size: 8,
            radix: 8,
            huge: 1
        }
    },
    doors: {
        none: {
            title: "None",
            table: {
                "01-06": ARCH
            },
            locks: {

            }
        },
        basic: {
            title: "Basic",
            table: {
                "01-15": ARCH,
                "16-60": DOOR,
                "61-70": DOOR | LOCKED,
                "71-90": DOOR | STUCK
            },
            locks: {
                
            }
        },
        standard: {
            title: "Standard",
            table: {
                "01-15": ARCH,
                "16-30": DOOR,
                "31-50": DOOR | STUCK,
                "51-65": DOOR | LOCKED,
                "66-80": DOOR | TRAPPED,
                "81-90": DOOR | LOCKED | TRAPPED,
                "91-100": DOOR | SECRET,
                "101-110": PORTC
            },
            locks: {
                
            }
        },
        secure: {
            title: "Secure",
            table: {
                "01-10": ARCH,
                "11-20": DOOR,
                "21-30": DOOR | STUCK,
                "31-50": DOOR | LOCKED,
                "51-70": DOOR | TRAPPED,
                "71-90": DOOR | LOCKED | TRAPPED,
                "91-100": DOOR | SECRET,
                "101-110": PORTC
            },
            locks: {
                
            }
        },
        deathtrap: {
            title: "Deathtrap",
            table: {
                "01-15": DOOR | LOCKED,
                "16-30": DOOR | TRAPPED,
                "31-40": DOOR | SECRET,
                "41-50": DOOR | LOCKED | TRAPPED
            },
            locks: {
                
            }
        }
    },
    corridor_layout: {
        labyrinth: {
            title: "Labyrinthian",
            pct: 0
        },
        squiggly: {
            title: "Squiggly",
            pct: 25
        },
        wandering: {
            title: "Wandering",
            pct: 50
        },
        organized: {
            title: "Organized",
            pct: 70
        },
        straight: {
            title: "Straight",
            pct: 100
        }
    },
    remove_deadends: {
        none: {
            title: "None",
            pct: 0
        },
        few: {
            title: "Few",
            pct: 20
        },
        some: {
            title: "Some",
            pct: 50
        },
        most: {
            title: "Most",
            pct: 80
        },
        all: {
            title: "All",
            pct: 100
        }
    },
    generosity: {
        fifty: {
            title: "50%",
            scale: 0.5
        },
        onehundred: {
            title: "100%",
            scale: 1
        },
        twohundred: {
            title: "200%",
            scale: 2
        },
        threehundred: {
            title: "300%",
            scale: 3
        },
        fourhundred: {
            title: "400%",
            scale: 4
        }
    },
    travel_distance: {
        short: {
            title: "In the Neighborhood",
            scale: 0.8,
            "Time": "1d6-3",
            "Treasure": 0.8,
            "Notes": "Everone knows a little something about these places! Proximity to town means significantly less risk for delvers and the site as probably been picked over before"
        },
        mid: {
            title: "Next Dungeon Over",
            scale: 1,
            "Time": "1d6+2",
            "Treasure": 1,
            "Notes": "Returning to town mid-delve is inconvenient but not impossible.",
        },
        long: {
            title: "Guys, I Think We're Lost",
            scale: 1.5,
            "Time": "2d6+4",
            "Treasure": 1.5,
            "Notes": "Travel is more difficult on this scale: Navigation and Weather Sense rolls are at -2. On the bright side, with greater time spent comes greater return on investment!"
        },
        super_far: {
            title: "I Don't Want To Take The Hobbits To Isengard",
            scale: 2.5,
            "Time": "4d6+16",
            "Treasure": 2.5,
            "Notes": "Travel at these distances is a real challenge: Navigation and Weather Sense rolls are at -5. This is conceivably a full season's round trip, and let's face it, nobody else has ever looted this dungeon!"
        }
    }
    /*,
    challenge: {
        cakewalk: {
            title: "Cakewalk",
        },
        easy: {
            title: "Easy",
        },
        average: {
            title: "Average",
        },
        hard: {
            title: "Hard",
        },
        evil: {
            title: "Evil",
        }
    }*/
};

/**
 * 
 * @param {weighted_table_entry[]} decoration
 * @param {weighted_table_entry[]} feature
 * @param {weighted_table_entry[]} decorations
 * @param {weighted_table_entry[]} decorationNumber
 * @param {weighted_table_entry[]} smellsNumber
 * @param {weighted_table_entry[]} smells
 * @param {weighted_table_entry[]} monsters
 * @param {weighted_table_entry[]} treasure
 * @param {weighted_table_entry[]} container
 * @param {weighted_table_entry[]} atmosphere
 * @param {weighted_table_entry[]} concealment
 * @param {weighted_table_entry[]} spring
 */
function tablesIDX(decoration, feature, decorations, decorationNumber, smellsNumber, smells, monsters, treasure, container, atmosphere, concealment, spring, threatDistribution, poison, traps) {
    this.decoration = decoration;
    this.feature = feature;
    this.decorations = decorations;
    this.decorationNumber = decorationNumber;
    this.smellsNumber = smellsNumber;
    this.smells = smells;
    this.monsters = monsters;
    this.treasure = treasure;
    this.container = container;
    this.atmosphere = atmosphere;
    this.concealment = concealment;
    this.spring = spring,
        this.threatDistribution = threatDistribution;
    this.poison = poison;
    this.traps = traps;
}

var tables_index = new tablesIDX(decorations, feature, decorations, decorationNumber, smellsNumber, smells, monsters, treasure, [], atmospheres, concealment, springs, threat_distribution, poison, traps);

/**
 * Configuration settings for the dungeon generator
 * @param {string} style - map style
 * @param {string} gridtype - grid type
 * @param {string} dunlayout - dungeon layout
 * @param {string} dunsize - dungeon size
 * @param {string} stairs - add stairs?
 * @param {string} rmlayout - room layout
 * @param {string} rmsize - room size
 * @param {string} drs - doors
 * @param {string} corlayout - corridor layout
 * @param {string} prunedeads - remove corridor deadends?
 * @param {number} cer - corridor layout
 * @param {string} challenge - general challenge distribution of encounters relative to cer
 */
function dungeon_configuration(style, gridtype, dunlayout, dunsize, stairs, rmlayout, rmsize, drs, corlayout, prunedeads, cer, challenge, generosity) {
    this.map_style = style;
    this.grid = gridtype;
    this.dungeon_layout = dunlayout;
    this.dungeon_size = dunsize;
    this.add_stairs = stairs;
    this.room_layout = rmlayout;
    this.room_size = rmsize;
    this.doors = drs;
    this.corridor_layout = corlayout;
    this.remove_deadends = prunedeads;
    this.cer = cer;
    //this.challenge = challenge;
    this.generosity = generosity;
}

function supports_local_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null && localStorage.setItem('test', '1');
  } catch(e){
    return false;
  }
}

/**
 * Tries to get a value from localstorage. If value is not available, 
 * initializes localstorage with the provided default, and returns the provided default.
 * @param {string} key
 * @param {object} default_value
 */
function FetchStorage(key,default_value){
    try {
    	var stored = window.localStorage.getItem(key);
        if (stored) {
            var tempval = JSON.parse(stored);
            return tempval[0];
        } else {
            UpdateStorage(key, default_value);
            return default_value;
        }
    } catch(e){
        return default_value;
    }
}

function UpdateStorage(key,val){
	var store = [];
	store.push(val);
	window.localStorage.setItem(key, JSON.stringify(store));
}

var last_saved_query = new dungeon_configuration(
    "ink_miser",
    "hex",
    "rectangle",
    "tiny", 
    "yes",
    "scattered",
    "medium",
    "standard",
    "organized",
    "most",
    125,
    "average",
    "onehundred"
);

if (supports_local_storage()) {
    /**
     * Last saved query settings for the HTML form
     */
    var Query_Storage = FetchStorage('last_saved_query');
    
    if(Query_Storage != null) {
        var last_saved_query_json = Query_Storage;

        if(last_saved_query_json == null) {
            last_saved_query_json = {};
        }
        last_saved_query = new dungeon_configuration(
            last_saved_query_json.map_style,
            last_saved_query_json.grid,
            last_saved_query_json.dungeon_layout,
            last_saved_query_json.dungeon_size,
            last_saved_query_json.add_stairs,
            last_saved_query_json.room_layout,
            last_saved_query_json.room_size,
            last_saved_query_json.doors,
            last_saved_query_json.corridor_layout,
            last_saved_query_json.remove_deadends,
            last_saved_query_json.cer,
            last_saved_query_json.generosity
        )
    }
} else {
    // Sorry! No Web Storage support..
}

/**
 * Default query settings for the HTML form
 */
var default_query = new dungeon_configuration(
    last_saved_query.map_style || "ink_miser",
    last_saved_query.grid || "hex",
    last_saved_query.dungeon_layout || "rectangle",
    last_saved_query.dungeon_size || "tiny", 
    last_saved_query.add_stairs || "yes",
    last_saved_query.room_layout || "scattered",
    last_saved_query.room_size || "medium",
    last_saved_query.doors || "standard",
    last_saved_query.corridor_layout || "organised",
    last_saved_query.remove_deadends || "most",
    last_saved_query.cer || 125,
    "average", // challenge currently not used
    last_saved_query.generosity || "onehundred"
);



/**
 * 
 * @param {number} rm_id
 * @param {Object} rm_size
 * @param {number} rm_row
 * @param {number} rm_col
 * @param {number} rm_north
 * @param {number} rm_south
 * @param {number} rm_west
 * @param {number} rm_east
 * @param {number} rm_height
 * @param {number} rm_width
 * @param {Object} rm_door
 * @param {string[]} rm_description
 */
function room_configuration(rm_id, rm_size, rm_row, rm_col, rm_north, rm_south, rm_west, rm_east, rm_height, rm_width, rm_door, rm_description) {
    this.id = rm_id || 0;
    this.size = rm_size || {
        height: 0,
        width: 0
    };
    this.row = rm_row || 0;
    this.col = rm_col || 0;
    this.north = rm_north || 0;
    this.south = rm_south || 0;
    this.west = rm_west || 0;
    this.east = rm_east || 0;
    this.height = rm_height || 0;
    this.width = rm_width || 0;
    this.door = rm_door || {
        north: [],
        south: [],
        west: [],
        east: []
    };
    this.description = rm_description || "Empty.";
}