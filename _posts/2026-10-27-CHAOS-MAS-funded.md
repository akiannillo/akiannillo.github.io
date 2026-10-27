---
layout: post
published: true
title: CHAOS-MAS is funded, and we are hiring a PhD candidate and a postdoc
date: '2026-10-27'
cover-img: /assets/img/chaos-llm.png
tags: [CHAOS-MAS, chaos engineering, LLM agents, positions]
---

I am thrilled to share that my project **CHAOS-MAS** has been funded by the Luxembourg National Research Fund (FNR) under the CORE 2026 programme. The project will run for three years at SnT, University of Luxembourg, in the SEDAN group, and starts in 2027.

## Why CHAOS-MAS

Earlier this year I wrote about [ChaosLLM](/2026-02-04-CHAOS-LLM/), our first step towards dependability testing for tool-calling agents. One finding stuck with me: agents cope reasonably well with obvious failures, but plausible yet slightly wrong tool outputs lead them to confident, incorrect answers.

Since then, agents have become even less isolated. They call external tools through protocols like the Model Context Protocol (MCP), they coordinate with other agents, and they are being deployed in settings where failures have real costs. In a multi-agent system, a single faulty tool response can cascade through the whole team. We still lack a rigorous way to test for this.

CHAOS-MAS brings chaos engineering to multi-agent, tool-using LLM systems. The project will deliver:

- a **fault taxonomy and injection toolkit** that perturbs agent-tool and agent-agent boundaries at the MCP layer;
- **robustness metrics** and an experimental protocol that stays statistically sound despite LLM non-determinism;
- **trace-guided root-cause localization**, to find where a failure started and how it propagated;
- **validated hardening patterns**, so that robustness becomes a design choice rather than luck.

Everything will be released as open source (Apache 2.0), together with open trace datasets for the community.

## Open positions

I am building the team now, and I am looking for two people.

**PhD candidate (4 years, full-time).** The PhD will lead the robustness benchmarking and the hardening patterns: defining the metrics, running large-scale fault injection campaigns on frameworks such as CrewAI and LangGraph, curating the public trace dataset, and turning the findings into validated design patterns. You hold (or are about to hold) a Master's degree in Computer Science, Software Engineering or a related field, have hands-on experience with LLMs and ideally with an agent framework, write solid Python, and care about making AI systems reliable.

Apply here: [Doctoral Researcher in Services and Data Management](https://www.uni.lu/en/jobs/doctoral-researcher-in-services-and-data-management/).

**Postdoctoral researcher (full-time).** The postdoc will lead the fault injection tooling and the root-cause localization work, and mentor the PhD candidate day to day. You hold a PhD in Computer Science and have published on fault injection, chaos engineering, dependability or adversarial testing (venues such as DSN, ISSRE, ICSE or TDSC are a strong signal). Experience with LLM agents, MCP or tool-use benchmarks, and with rigorous experimental methodology, is a big plus.

For both positions, feel free to drop me an email at [antonioken.iannillo@uni.lu](mailto:antonioken.iannillo@uni.lu) with your CV and a few lines on why CHAOS-MAS interests you. If you know someone who would be a great fit, please pass this on.

---

*CHAOS-MAS is funded by the Luxembourg National Research Fund (FNR), grant reference C26/IS-SAS/2001106.*
