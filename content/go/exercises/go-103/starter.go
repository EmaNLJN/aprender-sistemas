package main

type Rover struct { X, Y, Facing, Energy int }
func RunRover(program string, energy int) (Rover, bool) {
    rover := Rover{Energy: energy}
    for _, command := range program {
        switch command {
        case 'R': rover.Facing = (rover.Facing + 1) % 4
        case 'F':
            if rover.Energy == 0 { return rover, false }
            rover.Y++ // El motor todavía ignora la brújula.
            rover.Energy--
        default: return rover, false
        }
    }
    return rover, true
}