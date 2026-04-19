export interface Flashcard { q: string; a: string }
export const flashcards: Flashcard[] = [
  {
    "q": "What is the primary characteristic of DC current flow?",
    "a": "Flows in one direction"
  },
  {
    "q": "How does AC current change over time?",
    "a": "It alternates periodically and reverses several times per second"
  },
  {
    "q": "What is the standard frequency (f) of AC in many countries like Iraq?",
    "a": "50 Hz"
  },
  {
    "q": "How many times does the direction of 50 Hz AC reverse per second?",
    "a": "100 times"
  },
  {
    "q": "What is the AC frequency used in some other countries?",
    "a": "60 Hz"
  },
  {
    "q": "Why is AC recommended for long-distance transport?",
    "a": "It can be transported with minimum energy loss"
  },
  {
    "q": "What law of induction does AC follow?",
    "a": "Faraday's law of electromagnetic induction"
  },
  {
    "q": "What device is used to increase or decrease AC voltage?",
    "a": "Electric transformer"
  },
  {
    "q": "At what conditions is electric power transmitted in power stations to reduce loss?",
    "a": "High voltage and low current"
  },
  {
    "q": "Why is power transmitted with low current?",
    "a": "To reduce power loss (I\u00b2R) in transfer wires, which appears as heat"
  },
  {
    "q": "Where are step-up transformers used?",
    "a": "In power stations"
  },
  {
    "q": "Where are step-down transformers used?",
    "a": "In consumption sites in cities"
  },
  {
    "q": "What is the mathematical curve of induced AC voltage?",
    "a": "Sinusoidal curve"
  },
  {
    "q": "What is the formula for instantaneous AC voltage?",
    "a": "V = Vm sin(wt)"
  },
  {
    "q": "What is the formula for instantaneous AC current?",
    "a": "IR = Im sin(wt)"
  },
  {
    "q": "Define 'Phase'.",
    "a": "The kinetic state of the oscillating object in terms of position and direction of movement"
  },
  {
    "q": "Define 'Phase difference'.",
    "a": "Change in kinetic state of the oscillating object in two different moments or two objects at the same moment"
  },
  {
    "q": "What are the characteristics of the power curve for AC with pure resistance?",
    "a": "It is always positive and a cosine curve"
  },
  {
    "q": "Why is the power curve always positive in a pure resistor?",
    "a": "Voltage and current are in the same phase, both positive or negative at the same time"
  },
  {
    "q": "What is the average power (Pavg) in a pure resistor circuit?",
    "a": "Half the maximum power"
  },
  {
    "q": "What is the formula for maximum power (Pm)?",
    "a": "Pm = Im * Vm"
  },
  {
    "q": "Does dissipated power in a pure resistance depend on current direction?",
    "a": "No, it is directly proportional to the square of current (P = I\u00b2R)"
  },
  {
    "q": "What does a statement like 'AC current equals 1 Ampere' refer to?",
    "a": "The effective current (Ieff)"
  },
  {
    "q": "Can DC meters be used in AC circuits?",
    "a": "No, they read zero because they measure average alternating current"
  },
  {
    "q": "What do AC meters (ammeters/voltmeters) measure?",
    "a": "Effective current and voltage"
  },
  {
    "q": "Define 'Effective Alternating Current'.",
    "a": "The amount of AC that produces the same thermal effect as an equal amount of DC current through the same resistance"
  },
  {
    "q": "What is a pure inductor?",
    "a": "A coil without resistance"
  },
  {
    "q": "What is the phase difference in a pure inductor circuit?",
    "a": "Voltage leads current by \u03c0/2 (90 degrees)"
  },
  {
    "q": "What is 'Inductive Reactance' (XL)?",
    "a": "Opposition to the change in current"
  },
  {
    "q": "What is the formula for Inductive Reactance?",
    "a": "XL = 2\u03c0fL or XL = wL"
  },
  {
    "q": "How is XL related to frequency (f)?",
    "a": "Directly proportional"
  },
  {
    "q": "How is XL related to the coefficient of self-induction (L)?",
    "a": "Directly proportional"
  },
  {
    "q": "What does a coil act as at very high frequencies?",
    "a": "An open-switch, cutting off current"
  },
  {
    "q": "What does a coil act as at very low frequencies?",
    "a": "A pure resistance"
  },
  {
    "q": "What is the average power in a pure inductor circuit?",
    "a": "Zero"
  },
  {
    "q": "Why is average power zero in a pure inductor?",
    "a": "Energy moves to the source and returns as magnetic field energy; none is consumed"
  },
  {
    "q": "What is 'Capacitive Reactance' (XC)?",
    "a": "The opposition by the capacitor to the change in voltage"
  },
  {
    "q": "What is the formula for Capacitive Reactance?",
    "a": "XC = 1 / (2\u03c0fC)"
  },
  {
    "q": "How is XC related to frequency (f)?",
    "a": "Inversely proportional"
  },
  {
    "q": "How is XC related to capacitance (C)?",
    "a": "Inversely proportional"
  },
  {
    "q": "What does a capacitor act as at very low frequencies?",
    "a": "An open-switch (cuts off DC current)"
  },
  {
    "q": "What does a capacitor act as at very high frequencies?",
    "a": "A closed-switch"
  },
  {
    "q": "What is the average power in a pure capacitor circuit?",
    "a": "Zero"
  },
  {
    "q": "Why is average power zero in a capacitor?",
    "a": "It charges in one quarter and discharges in the next; no power is dissipated"
  },
  {
    "q": "In an R-L-C series circuit, if XL > XC, what are the properties?",
    "a": "Inductive properties"
  },
  {
    "q": "In an R-L-C series circuit, if XC > XL, what are the properties?",
    "a": "Capacitive properties"
  },
  {
    "q": "In an R-L-C series circuit, if XL = XC, what are the properties?",
    "a": "Pure resistance / Electric resonance"
  },
  {
    "q": "What is the phase difference angle (phi) in resonance?",
    "a": "Zero"
  },
  {
    "q": "What is 'Real Power' (Preal)?",
    "a": "Power consumed in the resistance"
  },
  {
    "q": "What is 'Apparent Power' (Papp)?",
    "a": "Total power supplied to the circuit"
  },
  {
    "q": "Define 'Power Factor' (Pf).",
    "a": "The ratio of real power to apparent power (Pf = Preal / Papp)"
  },
  {
    "q": "Can the power factor be greater than one?",
    "a": "No"
  },
  {
    "q": "What is an electromagnetic oscillation circuit?",
    "a": "A circuit consisting of an inductor (L) and capacitor (C)"
  },
  {
    "q": "What factors determine natural frequency in LC circuits?",
    "a": "L (self-inductance) and C (capacitance)"
  },
  {
    "q": "What happens to oscillation amplitude if the circuit has resistance?",
    "a": "It fades over time"
  },
  {
    "q": "On what does stored electric energy in a capacitor depend?",
    "a": "Capacitance (C), charge (Q), and potential difference (V)"
  },
  {
    "q": "On what does stored magnetic energy in an inductor depend?",
    "a": "Coefficient of self-induction (L) and current (I)"
  },
  {
    "q": "What is 'Quality Factor' (QF)?",
    "a": "Ratio of resonance angular frequency to angular frequency width"
  },
  {
    "q": "How does resistance affect the average power curve in resonance?",
    "a": "Small resistance makes it sharp; large resistance makes it wide"
  },
  {
    "q": "What is the relationship between QF and resistance?",
    "a": "Inversely proportional"
  },
  {
    "q": "What is the X-axis in a series combination phasor diagram?",
    "a": "Current (referential axis)"
  },
  {
    "q": "What is the referential axis in a parallel combination phasor diagram?",
    "a": "Voltage"
  },
  {
    "q": "How does an iron core affect inductive reactance?",
    "a": "Increases XL by increasing the self-induction coefficient (L)"
  },
  {
    "q": "What is the angular frequency (w) formula?",
    "a": "w = 2\u03c0f"
  },
  {
    "q": "What is the formula for resonance frequency (fr)?",
    "a": "fr = 1 / (2\u03c0 * sqrt(LC))"
  },
  {
    "q": "What is the formula for resonance angular frequency (wr)?",
    "a": "wr = 1 / sqrt(LC)"
  },
  {
    "q": "What is the effective voltage (Veff) ratio?",
    "a": "Veff = 0.707 * Vm"
  },
  {
    "q": "What is the effective current (Ieff) ratio?",
    "a": "Ieff = 0.707 * Im"
  },
  {
    "q": "What is the power factor formula using resistance and impedance?",
    "a": "Pf = R / Z"
  },
  {
    "q": "What does a positive power curve in AC represent?",
    "a": "Power consumed as heat"
  },
  {
    "q": "What is Joule's Law for power dissipation?",
    "a": "P = I\u00b2R"
  },
  {
    "q": "In resonance, what is the value of total impedance (Z)?",
    "a": "It is minimum (Z = R)"
  },
  {
    "q": "In resonance, what is the value of total current?",
    "a": "It is maximum"
  },
  {
    "q": "What is angular frequency width (\u0394w)?",
    "a": "Difference between angular frequencies at half-maximum power"
  },
  {
    "q": "What is the formula for Quality Factor (QF) involving L, C, and R?",
    "a": "QF = (1/R) * sqrt(L/C)"
  },
  {
    "q": "What does 'sinusoidal' mean for AC?",
    "a": "The value changes like a sine wave over time"
  },
  {
    "q": "What happens to XC when capacitance increases?",
    "a": "XC decreases"
  },
  {
    "q": "How does frequency affect ammeter reading in a capacitive circuit?",
    "a": "Higher frequency increases reading (more current)"
  },
  {
    "q": "How does frequency affect ammeter reading in an inductive circuit?",
    "a": "Higher frequency decreases reading (less current)"
  },
  {
    "q": "What is the unit of reactance (XL/XC)?",
    "a": "Ohm (\u03a9)"
  },
  {
    "q": "What property does a circuit have if its phase angle is negative?",
    "a": "Capacitive properties"
  },
  {
    "q": "What property does a circuit have if its phase angle is positive?",
    "a": "Inductive properties"
  },
  {
    "q": "What is referential axis for parallel circuits?",
    "a": "Voltage phase vector (V)"
  },
  {
    "q": "How is total current calculated in a parallel AC circuit?",
    "a": "IT = sqrt(IR\u00b2 + (IC - IL)\u00b2)"
  },
  {
    "q": "How is total impedance calculated in a series AC circuit?",
    "a": "Z = sqrt(R\u00b2 + (XL - XC)\u00b2)"
  },
  {
    "q": "What is the phase angle in a pure resistance circuit?",
    "a": "Phi = 0"
  },
  {
    "q": "What is the unit for Apparent Power?",
    "a": "Volt-Ampere (VA)"
  },
  {
    "q": "What is the unit for Real Power?",
    "a": "Watt (W)"
  },
  {
    "q": "What is the ratio of resonance frequency to width called?",
    "a": "Quality Factor"
  },
  {
    "q": "Why do DC meters read zero in AC?",
    "a": "Because the average of a full sine wave cycle is zero"
  },
  {
    "q": "Does inductive reactance consume power?",
    "a": "No"
  },
  {
    "q": "Does capacitive reactance consume power?",
    "a": "No"
  },
  {
    "q": "In an R-L-C parallel circuit, if IC > IL, what is the property?",
    "a": "Capacitive property"
  },
  {
    "q": "In an R-L-C parallel circuit, if IL > IC, what is the property?",
    "a": "Inductive property"
  },
  {
    "q": "What is the practical importance of series R-L-C circuits?",
    "a": "Used in various frequency sources to transfer maximum power"
  },
  {
    "q": "What represents the 'dialogue with the universe' in the text?",
    "a": "Every experiment in physics"
  }
];
