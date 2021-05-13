for color in ["gold", "red", "blue", "green"]:

    # Stop card
    template = open("templatestopcard.svg", "r")
    outputfile = open(f"{color}stop.svg", "w")
    for line in template.readlines():
        outputfile.write(line.replace("COLOR", color))
    outputfile.close()

    # +2 card
    template = open("template+2card.svg", "r")
    outputfile = open(f"{color}+2.svg", "w")
    for line in template.readlines():
        outputfile.write(line.replace("COLOR", color))
    outputfile.close()

    # dirSwap card
    template = open("templatedirSwapcard.svg", "r")
    outputfile = open(f"{color}dirSwap.svg", "w")
    for line in template.readlines():
        outputfile.write(line.replace("COLOR", color))
    outputfile.close()

    # Number cards
    for number in range(0,10):
        template = open("templatenumcard.svg", "r")
        outputfile = open(f"{color}{number}.svg", "w")

        for line in template.readlines():
            decoration = 'text-decoration="underline"' if (number == 6 or number == 9) else ''
            outputfile.write(line.replace("NUMBER", f"{number}").replace("COLOR", color).replace("TEXTDECORATION", decoration))
            
        outputfile.close()
