package main

type Rover struct { X, Y, Facing, Energy int }
func RunRover(program string, energy int) (Rover, bool) {
    rover := Rover{Energy: energy}
    directions := [4][2]int{{0, 1}, {1, 0}, {0, -1}, {-1, 0}}
    for _, command := range program {
        switch command {
        case 'R': rover.Facing = (rover.Facing + 1) % 4
        case 'F':
            if rover.Energy == 0 { return rover, false }
            delta := directions[rover.Facing]
            rover.X += delta[0]
            rover.Y += delta[1]
            rover.Energy--
        default: return rover, false
        }
    }
    return rover, true
}