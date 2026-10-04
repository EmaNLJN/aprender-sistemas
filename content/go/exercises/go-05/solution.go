package main

func HasFlags(flags, mask uint8) bool {
    return flags & mask == mask
}