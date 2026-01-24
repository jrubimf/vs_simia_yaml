export interface ExpressionInfo {
    type: string;
    description: string;
    example?: string;
}

export interface StepOptionInfo {
    description: string;
    values?: string[];
    snippet?: string;
}

// All DSL expressions with documentation
export const EXPRESSIONS: Record<string, ExpressionInfo> = {
    // Resources
    'energy': { type: 'resource', description: 'Current energy value', example: 'if=energy>=50' },
    'energy.max': { type: 'resource', description: 'Maximum energy', example: 'if=energy=energy.max' },
    'energy.deficit': { type: 'resource', description: 'Energy deficit (max - current)', example: 'if=energy.deficit<20' },
    'energy.pct': { type: 'resource', description: 'Energy percentage (0-100)', example: 'if=energy.pct>50' },
    'energy.regen': { type: 'resource', description: 'Energy regeneration rate', example: 'if=energy.regen>15' },
    'energy.time_to_max': { type: 'resource', description: 'Seconds until energy is full', example: 'if=energy.time_to_max<3' },

    'rage': { type: 'resource', description: 'Current rage value', example: 'if=rage>=30' },
    'rage.max': { type: 'resource', description: 'Maximum rage', example: 'if=rage=rage.max' },
    'rage.deficit': { type: 'resource', description: 'Rage deficit', example: 'if=rage.deficit<20' },

    'runic_power': { type: 'resource', description: 'Current runic power', example: 'if=runic_power>=80' },
    'runic_power.max': { type: 'resource', description: 'Maximum runic power' },
    'runic_power.deficit': { type: 'resource', description: 'Runic power deficit' },

    'rune': { type: 'resource', description: 'Available rune count', example: 'if=rune>=3' },

    'focus': { type: 'resource', description: 'Current focus value', example: 'if=focus>=50' },
    'focus.max': { type: 'resource', description: 'Maximum focus' },
    'focus.deficit': { type: 'resource', description: 'Focus deficit' },
    'focus.pct': { type: 'resource', description: 'Focus percentage' },
    'focus.regen': { type: 'resource', description: 'Focus regeneration rate' },
    'focus.time_to_max': { type: 'resource', description: 'Seconds until focus is full' },

    'mana': { type: 'resource', description: 'Current mana value', example: 'if=mana>=1000' },
    'mana.max': { type: 'resource', description: 'Maximum mana' },
    'mana.deficit': { type: 'resource', description: 'Mana deficit' },
    'mana.pct': { type: 'resource', description: 'Mana percentage', example: 'if=mana.pct>30' },
    'mana.regen': { type: 'resource', description: 'Mana regeneration rate' },
    'mana.time_to_max': { type: 'resource', description: 'Seconds until mana is full' },

    'combo_points': { type: 'resource', description: 'Current combo points', example: 'if=combo_points>=5' },
    'combo_points.max': { type: 'resource', description: 'Maximum combo points' },
    'combo_points.deficit': { type: 'resource', description: 'Combo points deficit' },

    'soul_shards': { type: 'resource', description: 'Current soul shards (Warlock)' },
    'holy_power': { type: 'resource', description: 'Current holy power (Paladin)' },
    'chi': { type: 'resource', description: 'Current chi (Monk)' },
    'insanity': { type: 'resource', description: 'Current insanity (Shadow Priest)' },
    'stagger': { type: 'resource', description: 'Current stagger amount (Brewmaster)' },
    'stagger.pct': { type: 'resource', description: 'Stagger as % of max health', example: 'if=stagger.pct>60' },
    'arcane_charges': { type: 'resource', description: 'Current arcane charges (Arcane Mage)' },
    'fury': { type: 'resource', description: 'Current fury (Demon Hunter)' },
    'pain': { type: 'resource', description: 'Current pain (Vengeance DH)' },
    'maelstrom': { type: 'resource', description: 'Current maelstrom (Enhancement Shaman)' },
    'astral_power': { type: 'resource', description: 'Current astral power (Balance Druid)' },
    'essence': { type: 'resource', description: 'Current essence (Evoker)' },

    // Health
    'health': { type: 'health', description: 'Player health percentage (0-100)', example: 'if=health<50' },
    'health.pct': { type: 'health', description: 'Player health percentage', example: 'if=health.pct<=30' },
    'health.max': { type: 'health', description: 'Player maximum health' },
    'health.deficit': { type: 'health', description: 'Player missing health amount' },

    'player.health': { type: 'health', description: 'Player health percentage' },
    'player.health.pct': { type: 'health', description: 'Player health percentage' },
    'player.health.max': { type: 'health', description: 'Player maximum health' },
    'player.health.deficit': { type: 'health', description: 'Player missing health' },

    'target.health': { type: 'health', description: 'Target health percentage' },
    'target.health.pct': { type: 'health', description: 'Target health percentage', example: 'if=target.health.pct<=20' },
    'target.time_to_die': { type: 'health', description: 'Estimated seconds until target dies', example: 'if=target.time_to_die>15' },
    'time_to_die': { type: 'health', description: 'Alias for target.time_to_die' },
    'fight_remains': { type: 'health', description: 'Estimated time remaining in fight' },

    'focus.health': { type: 'health', description: 'Focus target health percentage' },
    'mouseover.health': { type: 'health', description: 'Mouseover health percentage' },
    'pet.health': { type: 'health', description: 'Pet health percentage', example: 'if=pet.health<40' },

    // Buffs (templates - SPELL is placeholder)
    'buff.SPELL.up': { type: 'buff', description: 'Buff is active (1 if true, 0 if false)', example: 'if=buff.bloodlust.up' },
    'buff.SPELL.down': { type: 'buff', description: 'Buff is NOT active', example: 'if=buff.shield.down' },
    'buff.SPELL.remains': { type: 'buff', description: 'Time remaining in seconds', example: 'if=buff.haste_buff.remains<5' },
    'buff.SPELL.stack': { type: 'buff', description: 'Current stack count', example: 'if=buff.power_stacks.stack>=3' },
    'buff.SPELL.duration': { type: 'buff', description: 'Base duration of the buff' },
    'buff.SPELL.refreshable': { type: 'buff', description: 'Buff can be refreshed (pandemic window)' },
    'buff.SPELL.react': { type: 'buff', description: 'Buff is active (same as .up, for procs)' },

    // Debuffs
    'debuff.SPELL.up': { type: 'debuff', description: 'Debuff is active on target', example: 'if=debuff.vulnerability.up' },
    'debuff.SPELL.down': { type: 'debuff', description: 'Debuff is NOT on target', example: 'if=debuff.curse.down' },
    'debuff.SPELL.remains': { type: 'debuff', description: 'Time remaining', example: 'if=debuff.poison.remains<3' },
    'debuff.SPELL.stack': { type: 'debuff', description: 'Stack count', example: 'if=debuff.wound.stack<5' },
    'debuff.SPELL.refreshable': { type: 'debuff', description: 'Debuff can be refreshed' },
    'debuff.SPELL.ticking': { type: 'debuff', description: 'Debuff is active (alias of .up)' },

    // DoTs
    'dot.SPELL.ticking': { type: 'dot', description: 'DoT is active', example: 'if=dot.corruption.ticking' },
    'dot.SPELL.remains': { type: 'dot', description: 'DoT time remaining', example: 'if=dot.corruption.remains<3' },
    'dot.SPELL.refreshable': { type: 'dot', description: 'DoT can be refreshed (pandemic)' },
    'dot.SPELL.stack': { type: 'dot', description: 'DoT stack count' },
    'active_dot.SPELL': { type: 'dot', description: 'Count of enemies with your DoT', example: 'if=active_dot.corruption>=3' },

    // Cooldowns
    'cooldown.SPELL.ready': { type: 'cooldown', description: 'Spell is ready (off cooldown)', example: 'if=cooldown.big_damage.ready' },
    'cooldown.SPELL.up': { type: 'cooldown', description: 'Same as .ready' },
    'cooldown.SPELL.down': { type: 'cooldown', description: 'Spell is on cooldown' },
    'cooldown.SPELL.remains': { type: 'cooldown', description: 'Time until ready', example: 'if=cooldown.burst.remains<5' },
    'cooldown.SPELL.charges': { type: 'cooldown', description: 'Current charge count', example: 'if=cooldown.blink.charges>=1' },
    'cooldown.SPELL.max_charges': { type: 'cooldown', description: 'Maximum charges' },
    'cooldown.SPELL.full_recharge_time': { type: 'cooldown', description: 'Time until all charges restored' },
    'cooldown.SPELL.charges_fractional': { type: 'cooldown', description: 'Charges including partial progress' },

    // Usable/Range
    'usable.SPELL': { type: 'spell', description: 'Spell is usable (resources + off CD)', example: 'if=usable.expensive_ability' },
    'range.SPELL.target': { type: 'range', description: 'Spell is in range for target', example: 'if=range.snipe.target' },
    'range.SPELL.focus': { type: 'range', description: 'Spell is in range for focus' },
    'range.SPELL.mouseover': { type: 'range', description: 'Spell is in range for mouseover' },

    // Talents
    'talent.TALENT': { type: 'talent', description: 'Talent is selected (1 if true)', example: 'if=talent.improved_spell' },
    'talent.TALENT.enabled': { type: 'talent', description: 'Talent is selected' },
    'talent.TALENT.rank': { type: 'talent', description: 'Talent rank (0 if not selected)', example: 'if=talent.power_talent.rank>=2' },

    // Action properties
    'action.SPELL.charges': { type: 'action', description: 'Action charges' },
    'action.SPELL.cast_time': { type: 'action', description: 'Cast time in seconds' },
    'action.SPELL.execute_time': { type: 'action', description: 'Max of cast_time and GCD' },

    // GCD
    'gcd': { type: 'gcd', description: 'Current GCD duration', example: 'if=gcd<1.2' },
    'gcd.max': { type: 'gcd', description: 'Maximum GCD (usually 1.5s)' },
    'gcd.remains': { type: 'gcd', description: 'Time until GCD expires', example: 'if=gcd.remains<0.2' },
    'player.gcd': { type: 'gcd', description: 'Current GCD duration' },
    'player.gcd.remains': { type: 'gcd', description: 'Time until GCD expires' },

    // Previous cast
    'prev_gcd.1.SPELL': { type: 'prev', description: 'Last GCD was this spell', example: 'if=prev_gcd.1.setup_spell' },
    'prev_gcd.2.SPELL': { type: 'prev', description: 'Two GCDs ago was this spell' },
    'prev_gcd.3.SPELL': { type: 'prev', description: 'Three GCDs ago was this spell' },

    // Player state
    'player.dead': { type: 'state', description: 'Player is dead' },
    'player.alive': { type: 'state', description: 'Player is alive' },
    'player.moving': { type: 'state', description: 'Player is moving', example: 'if=!player.moving' },
    'player.moving.time': { type: 'state', description: 'Seconds player has been moving' },
    'player.standing': { type: 'state', description: 'Player is standing still' },
    'player.standing.time': { type: 'state', description: 'Seconds standing still' },
    'player.mounted': { type: 'state', description: 'Player is mounted' },
    'player.in_vehicle': { type: 'state', description: 'Player is in a vehicle' },
    'player.casting': { type: 'state', description: 'Player is casting', example: 'if=!player.casting' },
    'player.channeling': { type: 'state', description: 'Player is channeling' },
    'player.casting.spell': { type: 'state', description: 'Currently casting spell ID' },
    'player.casting.remains': { type: 'state', description: 'Time remaining on cast' },
    'player.casting.elapsed': { type: 'state', description: 'Time spent casting' },
    'player.combat': { type: 'state', description: 'Player is in combat' },
    'player.combat.time': { type: 'state', description: 'Time in combat (seconds)', example: 'if=player.combat.time<5' },
    'player.empower_stage': { type: 'state', description: 'Evoker empower stage (1-4)', example: 'if=player.empower_stage>=2' },
    'player.burst.active': { type: 'state', description: 'Any burst buff is active', example: 'if=player.burst.active' },
    'player.burst.count': { type: 'state', description: 'Number of active burst buffs' },

    // Player CC/LoC
    'player.stunned': { type: 'cc', description: 'Player is stunned', example: 'if=player.stunned' },
    'player.stunned.remains': { type: 'cc', description: 'Stun duration remaining' },
    'player.rooted': { type: 'cc', description: 'Player is rooted' },
    'player.rooted.remains': { type: 'cc', description: 'Root duration remaining' },
    'player.feared': { type: 'cc', description: 'Player is feared' },
    'player.silenced': { type: 'cc', description: 'Player is silenced' },
    'player.incapacitated': { type: 'cc', description: 'Player is incapacitated' },
    'player.charmed': { type: 'cc', description: 'Player is mind controlled' },
    'player.disarmed': { type: 'cc', description: 'Player is disarmed' },
    'player.cc': { type: 'cc', description: 'Player cannot act (stunned/feared/etc)', example: 'if=player.cc' },

    // Player role
    'player.tank': { type: 'role', description: 'Player is a tank', example: 'if=player.tank' },
    'player.healer': { type: 'role', description: 'Player is a healer' },
    'player.dps': { type: 'role', description: 'Player is DPS' },
    'player.melee': { type: 'role', description: 'Player uses melee attacks' },
    'player.ranged': { type: 'role', description: 'Player uses ranged attacks' },
    'player.evoker': { type: 'role', description: 'Player is an Evoker' },

    // Player stats
    'player.haste_pct': { type: 'stat', description: 'Haste percentage', example: 'if=player.haste_pct>=30' },
    'player.haste': { type: 'stat', description: 'Haste percentage (alias)' },
    'player.crit_pct': { type: 'stat', description: 'Critical strike percentage' },
    'player.crit': { type: 'stat', description: 'Critical strike percentage (alias)' },
    'player.versa_pct': { type: 'stat', description: 'Versatility percentage' },
    'player.versatility': { type: 'stat', description: 'Versatility percentage (alias)' },
    'player.mastery_pct': { type: 'stat', description: 'Mastery percentage' },
    'player.mastery': { type: 'stat', description: 'Mastery percentage (alias)' },

    // Player instance/zone
    'player.indungeon': { type: 'zone', description: 'Player is in a dungeon' },
    'player.inraid': { type: 'zone', description: 'Player is in a raid' },
    'player.inpvecontent': { type: 'zone', description: 'In dungeon, raid, or delve' },
    'player.inmythicplus': { type: 'zone', description: 'In active M+ keystone', example: 'if=player.inmythicplus' },
    'player.inarena': { type: 'zone', description: 'In arena' },
    'player.inpvp': { type: 'zone', description: 'In battleground' },
    'player.ininstancedpvp': { type: 'zone', description: 'In arena or battleground' },
    'player.indelve': { type: 'zone', description: 'In a delve' },
    'player.inscenario': { type: 'zone', description: 'In a scenario' },
    'player.keystonelevel': { type: 'zone', description: 'Current M+ keystone level', example: 'if=player.keystonelevel>=15' },
    'player.boss_fight': { type: 'zone', description: 'Boss unit frames exist' },

    // Player debuff checks
    'player.has_magic_debuff': { type: 'debuff', description: 'Player has any magic debuff' },
    'player.has_curse': { type: 'debuff', description: 'Player has any curse debuff' },
    'player.has_disease': { type: 'debuff', description: 'Player has any disease debuff' },
    'player.has_poison': { type: 'debuff', description: 'Player has any poison debuff' },

    // Target
    'target.exists': { type: 'target', description: 'Target exists', example: 'if=target.exists' },
    'target.alive': { type: 'target', description: 'Target is alive' },
    'target.dead': { type: 'target', description: 'Target is dead' },
    'target.enemy': { type: 'target', description: 'Target is an enemy' },
    'target.friendly': { type: 'target', description: 'Target is friendly' },
    'target.boss': { type: 'target', description: 'Target is a boss', example: 'if=target.boss' },
    'target.range': { type: 'target', description: 'Distance to target in yards', example: 'if=target.range<8' },
    'target.moving': { type: 'target', description: 'Target is moving' },
    'target.casting': { type: 'target', description: 'Target is casting' },
    'target.channeling': { type: 'target', description: 'Target is channeling' },
    'target.casting.spell': { type: 'target', description: 'Target casting spell ID' },
    'target.casting.remains': { type: 'target', description: 'Target cast time remaining' },
    'target.casting.elapsed': { type: 'target', description: 'Target cast time elapsed' },
    'target.casting.interruptible': { type: 'target', description: 'Target cast can be interrupted', example: 'if=target.casting.interruptible' },
    'target.casting.important': { type: 'target', description: 'Target cast is in _interrupts.yaml' },
    'target.casting.targeting_me': { type: 'target', description: 'Target cast is targeting player' },
    'target.valid': { type: 'target', description: 'Comprehensive target check (exists, enemy, alive, combat)' },
    'target.npcid': { type: 'target', description: 'NPC ID from GUID' },
    'target.bypass_combat': { type: 'target', description: 'NPC bypasses combat checks (from _npcdata.yaml)' },
    'target.should_stun': { type: 'target', description: 'NPC should be stunned (from _npcdata.yaml)' },
    'target.should_slow': { type: 'target', description: 'NPC should be slowed (from _npcdata.yaml)' },
    'target.has_stealable': { type: 'target', description: 'Target has any stealable buff' },
    'target.has_magic_buff': { type: 'target', description: 'Target has any magic buff' },
    'target.has_enrage': { type: 'target', description: 'Target has an enrage effect' },

    // Focus
    'focus.exists': { type: 'unit', description: 'Focus target exists' },
    'focus.alive': { type: 'unit', description: 'Focus is alive' },
    'focus.enemy': { type: 'unit', description: 'Focus is an enemy' },
    'focus.friendly': { type: 'unit', description: 'Focus is friendly' },
    'focus.range': { type: 'unit', description: 'Distance to focus' },
    'focus.casting': { type: 'unit', description: 'Focus is casting' },
    'focus.casting.interruptible': { type: 'unit', description: 'Focus cast can be interrupted' },
    'focus.casting.remains': { type: 'unit', description: 'Focus cast time remaining' },

    // Mouseover
    'mouseover.exists': { type: 'unit', description: 'Mouseover unit exists' },
    'mouseover.alive': { type: 'unit', description: 'Mouseover is alive' },
    'mouseover.enemy': { type: 'unit', description: 'Mouseover is an enemy' },
    'mouseover.friendly': { type: 'unit', description: 'Mouseover is friendly' },
    'mouseover.health.pct': { type: 'unit', description: 'Mouseover health percentage' },
    'mouseover.range': { type: 'unit', description: 'Distance to mouseover' },
    'mouseover.casting': { type: 'unit', description: 'Mouseover is casting' },
    'mouseover.casting.interruptible': { type: 'unit', description: 'Mouseover cast can be interrupted' },

    // Pet
    'pet.exists': { type: 'pet', description: 'Pet exists' },
    'pet.alive': { type: 'pet', description: 'Pet is alive' },
    'pet.nearby_enemies': { type: 'pet', description: 'Enemies within 8 yards of pet' },

    // Enemy counts
    'active_enemies': { type: 'combat', description: 'Enemies in combat range', example: 'if=active_enemies>=3' },
    'spell_targets': { type: 'combat', description: 'Same as active_enemies' },
    'enemies.8y': { type: 'combat', description: 'Enemies within 8 yards' },
    'enemies.15y': { type: 'combat', description: 'Enemies within 15 yards' },
    'enemies.40y': { type: 'combat', description: 'Enemies within 40 yards' },
    'enemies.combat.8y': { type: 'combat', description: 'Enemies in combat within 8y' },
    'enemies.combat.15y': { type: 'combat', description: 'Enemies in combat within 15y' },
    'enemies.combat.40y': { type: 'combat', description: 'Enemies in combat within 40y' },
    'combat.enemies': { type: 'combat', description: 'Enemies in combat (deprecated)' },
    'combat.enemies.8y': { type: 'combat', description: 'Enemies in combat within 8y' },

    // Group/Healing
    'group.lowest.health.pct': { type: 'group', description: 'Lowest member health %', example: 'if=group.lowest.health.pct<50' },
    'group.lowest.range': { type: 'group', description: 'Range to lowest member' },
    'group.tanks.lowest.health.pct': { type: 'group', description: 'Lowest tank health %' },
    'group.healers.lowest.health.pct': { type: 'group', description: 'Lowest healer health %' },
    'group.dps.lowest.health.pct': { type: 'group', description: 'Lowest DPS health %' },
    'group.under_pct_30': { type: 'group', description: 'Members under 30% health' },
    'group.under_pct_50': { type: 'group', description: 'Members under 50% health' },
    'group.under_pct_75': { type: 'group', description: 'Members under 75% health' },
    'group.under_pct_80': { type: 'group', description: 'Members under 80% health' },
    'group.in_range_10': { type: 'group', description: 'Members within 10 yards' },
    'group.in_range_30': { type: 'group', description: 'Members within 30 yards' },
    'group.in_range_40': { type: 'group', description: 'Members within 40 yards' },

    // Totem
    'totem.SPELL.up': { type: 'totem', description: 'Totem is active', example: 'if=totem.fire_elemental.up' },
    'totem.SPELL.remains': { type: 'totem', description: 'Time until totem expires' },

    // Equipment
    'trinket_1.ready': { type: 'equipment', description: 'Trinket 1 is off cooldown' },
    'trinket_1.cd': { type: 'equipment', description: 'Trinket 1 cooldown remaining' },
    'trinket_1.id': { type: 'equipment', description: 'Trinket 1 item ID' },
    'trinket_1.usable': { type: 'equipment', description: 'Trinket 1 is usable' },
    'trinket_1.sync': { type: 'equipment', description: 'Trinket 1 ready + burst check', example: 'if=trinket_1.sync' },
    'trinket_2.ready': { type: 'equipment', description: 'Trinket 2 is off cooldown' },
    'trinket_2.cd': { type: 'equipment', description: 'Trinket 2 cooldown remaining' },
    'trinket_2.id': { type: 'equipment', description: 'Trinket 2 item ID' },
    'trinket_2.usable': { type: 'equipment', description: 'Trinket 2 is usable' },
    'trinket_2.sync': { type: 'equipment', description: 'Trinket 2 ready + burst check' },
    'main_hand.2h': { type: 'equipment', description: '1 if using 2H weapon' },
    'mainhand.enchant.up': { type: 'equipment', description: 'Main hand has temp enchant' },
    'mainhand.enchant.remains': { type: 'equipment', description: 'Main hand enchant time left' },
    'offhand.enchant.up': { type: 'equipment', description: 'Off hand has temp enchant' },
    'offhand.enchant.remains': { type: 'equipment', description: 'Off hand enchant time left' },
    'set_bonus.TIER_2pc': { type: 'equipment', description: 'Have 2-piece tier bonus' },
    'set_bonus.TIER_4pc': { type: 'equipment', description: 'Have 4-piece tier bonus' },

    // Consumables
    'healthstone.ready': { type: 'consumable', description: 'Healthstone is ready' },
    'healthstone.cd': { type: 'consumable', description: 'Healthstone cooldown' },
    'health_potion.ready': { type: 'consumable', description: 'Health potion is ready' },
    'mana_potion.ready': { type: 'consumable', description: 'Mana potion is ready' },
    'combat_potion.ready': { type: 'consumable', description: 'Combat potion is ready' },

    // Interrupts (from _interrupts.yaml)
    'interrupts.target.ready': { type: 'interrupt', description: 'Target casting interruptible spell' },
    'interrupts.target.stun.ready': { type: 'interrupt', description: 'Target casting stun-able spell' },
    'interrupts.focus.ready': { type: 'interrupt', description: 'Focus casting interruptible spell' },
    'interrupts.8y.ready': { type: 'interrupt', description: 'Any enemy in 8y casting interruptible' },
    'interrupts.40y.ready': { type: 'interrupt', description: 'Any enemy in 40y casting interruptible' },
    'interrupts.8y.count': { type: 'interrupt', description: 'Count of enemies casting in 8y' },

    // Defensives (from _defensives.yaml)
    'defensives.ready': { type: 'defensive', description: 'Enemy casting dangerous spell' },
    'defensives.ready.aoe': { type: 'defensive', description: 'Enemy casting AoE spell' },

    // Reflectable (from _reflectable.yaml)
    'reflectable.ready': { type: 'reflect', description: 'Enemy casting reflectable spell' },

    // System state
    'state.rotation': { type: 'state', description: 'Rotation enabled/disabled' },
    'state.cds': { type: 'state', description: 'Cooldowns enabled/disabled', example: 'if=state.cds' },
    'state.aoe': { type: 'state', description: 'AOE mode enabled/disabled' },
    'state.blocked_inputs': { type: 'state', description: 'Input blocking enabled' },

    // Variables and config
    'var.VARNAME': { type: 'variable', description: 'User-defined variable value', example: 'if=var.pooling' },
    'config.SETTING': { type: 'config', description: 'User config setting value', example: 'if=config.use_aoe' },
    'settings.SETTING': { type: 'config', description: 'Alias for config.SETTING' },

    // Literals
    'true': { type: 'literal', description: 'Always true (1)' },
    'false': { type: 'literal', description: 'Always false (0)' },
};

// Step options for action lines
export const STEP_OPTIONS: Record<string, StepOptionInfo> = {
    'range_check': {
        description: 'Control range validation for this action',
        values: ['target', 'mouseover', 'focus', 'mob_count_8y', 'mob_count_40y', 'none'],
        snippet: 'range_check=${1|target,mouseover,focus,mob_count_8y,none|}'
    },
    'casting_check': {
        description: 'Only cast while player is casting specific spell',
        values: ['none', 'any', 'SPELL_ID', 'spell_name'],
        snippet: 'casting_check=${1:any}'
    },
    'cast_remains': {
        description: 'Only during last X seconds of current cast',
        snippet: 'cast_remains=${1:0.5}'
    },
    'channel_remains': {
        description: 'Only during last X seconds of current channel',
        snippet: 'channel_remains=${1:1.0}'
    },
    'interrupt': {
        description: 'Allow this action to interrupt current cast',
        values: ['true', 'false'],
        snippet: 'interrupt=true'
    },
    'ignore_cooldown': {
        description: 'Skip cooldown check for this spell',
        values: ['true', 'false'],
        snippet: 'ignore_cooldown=true'
    },
    'ignore_usable': {
        description: 'Skip usability check for this spell',
        values: ['true', 'false'],
        snippet: 'ignore_usable=true'
    },
    'ignore_movement': {
        description: 'Allow casting while moving (for spells like Scorch)',
        values: ['true', 'false'],
        snippet: 'ignore_movement=true'
    },
    'hotkey': {
        description: 'Override the virtual key code for this action',
        snippet: 'hotkey=${1:49}'
    },
    'modifier': {
        description: 'Modifier key (16=Shift, 17=Ctrl, 18=Alt)',
        values: ['16', '17', '18'],
        snippet: 'modifier=${1|16,17,18|}'
    },
    'override': {
        description: 'Use another spell\'s keybind',
        snippet: 'override=${1:spell_name}'
    },
    'delay': {
        description: 'Minimum ms between presses for this spell',
        snippet: 'delay=${1:100}'
    },
    'global_delay': {
        description: 'Set global delay until channel is true',
        snippet: 'global_delay=${1:100}'
    },
    'target': {
        description: 'Direct targeting (lowest, tanks.lowest, etc)',
        values: ['lowest', 'tanks.lowest', 'healers.lowest', 'dps.lowest'],
        snippet: 'target=${1|lowest,tanks.lowest,healers.lowest,dps.lowest|}'
    },
    'cycle': {
        description: 'Cycle through group members',
        values: ['members', 'tanks', 'healers', 'dps'],
        snippet: 'cycle=${1|members,tanks,healers,dps|}'
    }
};

// Special actions (not spells)
export const SPECIAL_ACTIONS: Record<string, string> = {
    'trinket_1': 'Use trinket in slot 1',
    'trinket_2': 'Use trinket in slot 2',
    'weapon_onuse': 'Use weapon on-use effect',
    'wrist_onuse': 'Use wrist on-use effect',
    'helm_onuse': 'Use helm on-use effect',
    'cloak_onuse': 'Use cloak on-use effect',
    'belt_onuse': 'Use belt on-use effect',
    'healthstone': 'Use healthstone',
    'health_potion': 'Use health potion',
    'mana_potion': 'Use mana potion',
    'combat_potion': 'Use combat/DPS potion',
    'augment_rune': 'Use augment rune',
    'target_enemy': 'Target nearest attackable enemy',
    'target_mouseover': 'Target current mouseover unit',
    'attack_target': 'Start auto-attacking target',
    'interact_target': 'Interact with target (loot, talk)',
    'interact_mouseover': 'Interact with mouseover unit',
    'loot_a_rang': 'Use Loot-A-Rang',
    'return': 'Stop rotation evaluation',
    'stop_casting': 'Cancel current cast',
    'queue_spell': 'Cast spell from Lua addon queue',
    'call_action_list': 'Call another action list'
};
