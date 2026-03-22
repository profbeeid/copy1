-- Seed: ~50 starter briefs across brands, tasks, segments, and content jobs

insert into briefs (brand, task_type, text, source, priority, segment, content_job) values

-- WnR · IG Caption · gift_buyer · object_value
('wnr', 'ig_caption', 'WnR Acacia IG caption, Indonesian, buyer is choosing a gift, focus on how the jar signals refined taste to the recipient, no health claims', 'manual', 1, 'gift_buyer', 'object_value'),
('wnr', 'ig_caption', 'WnR Mango IG caption, Indonesian, gift context, the jar itself as an object worth giving — not honey as a health product', 'manual', 1, 'gift_buyer', 'object_value'),
('wnr', 'ig_caption', 'WnR Signature IG caption, Indonesian, gifting season, what it says about the giver to give something this specific and considered', 'manual', 2, 'gift_buyer', 'object_value'),

-- WnR · IG Caption · gift_buyer · ritual
('wnr', 'ig_caption', 'WnR Acacia IG caption, Indonesian, morning ritual context, the receiver integrating this into their daily life as a considered practice', 'manual', 2, 'gift_buyer', 'ritual'),
('wnr', 'ig_caption', 'WnR Rambutan IG caption, Indonesian, gift framing, the idea of giving someone a sensory experience they didn't know existed', 'manual', 2, 'gift_buyer', 'ritual'),

-- WnR · IG Caption · gift_buyer · social_proof
('wnr', 'ig_caption', 'WnR Acacia IG caption, Indonesian, someone who already knows honey giving it to someone who doesn't yet — the transfer of taste knowledge', 'manual', 3, 'gift_buyer', 'social_proof'),

-- WnR · IG Caption · personal_premium · sensory_specificity
('wnr', 'ig_caption', 'WnR Acacia IG caption, Indonesian, describe the flavor: light floral, almost vanillic finish, specific not generic', 'manual', 1, 'personal_premium', 'sensory_specificity'),
('wnr', 'ig_caption', 'WnR Mango IG caption, Indonesian, specific sensory detail — tropical but not loud, the way it sits in tea vs eaten raw', 'manual', 1, 'personal_premium', 'sensory_specificity'),
('wnr', 'ig_caption', 'WnR Rambutan IG caption, Indonesian, the unusual floral sweetness — how it differs from what people expect honey to taste like', 'manual', 1, 'personal_premium', 'sensory_specificity'),
('wnr', 'ig_caption', 'WnR Signature IG caption, Indonesian, the blend philosophy behind Signature, why it exists alongside single-origin variants', 'manual', 2, 'personal_premium', 'sensory_specificity'),

-- WnR · IG Caption · personal_premium · provenance
('wnr', 'ig_caption', 'WnR Acacia IG caption, Indonesian, where Acacia nectar comes from, the geography that makes this flavor possible', 'manual', 2, 'personal_premium', 'provenance'),
('wnr', 'ig_caption', 'WnR Mango IG caption, Indonesian, single-origin provenance story — one source, one batch, not blended', 'manual', 2, 'personal_premium', 'provenance'),

-- WnR · IG Caption · discovery · provocation_hook
('wnr', 'ig_caption', 'WnR IG caption, Indonesian, provocation hook: most people don't know honey has distinct flavor profiles — aku baru tau madu ada rasanya energy', 'manual', 1, 'discovery', 'provocation_hook'),
('wnr', 'ig_caption', 'WnR Acacia IG caption, Indonesian, challenge the assumption that honey is just sweet — it has a flavor geography most people have never experienced', 'manual', 1, 'discovery', 'provocation_hook'),

-- WnR · IG Caption · discovery · tension
('wnr', 'ig_caption', 'WnR Mango IG caption, Indonesian, tension between knowing and not knowing — the reader is missing something specific and knowable', 'manual', 2, 'discovery', 'tension'),
('wnr', 'ig_caption', 'WnR Rambutan IG caption, Indonesian, create a gap: there is a version of this experience that is better and the reader doesn't have it yet', 'manual', 2, 'discovery', 'tension'),

-- WnR · TikTok Caption
('wnr', 'tiktok_caption', 'WnR Acacia TikTok caption, Indonesian, hook-first, the reveal that honey has a flavor people haven't noticed, energy: I didn't know this', 'manual', 1, 'discovery', 'provocation_hook'),
('wnr', 'tiktok_caption', 'WnR Mango TikTok caption, Indonesian, short punchy hook, sensory reveal — what does single-origin honey actually mean for flavor', 'manual', 2, 'discovery', 'provocation_hook'),

-- WnR · Product Desc
('wnr', 'product_desc', 'WnR Acacia product description, Indonesian, for marketplace listing — specific flavor profile, use context, who it is for', 'manual', 2, 'personal_premium', 'sensory_specificity'),
('wnr', 'product_desc', 'WnR Mango product description, Indonesian, lead with sensory, secondary on gifting utility, no generic health claims', 'manual', 2, 'gift_buyer', 'object_value'),

-- NCTR · TikTok Caption
('nctr', 'tiktok_caption', 'NCTR honey TikTok caption, Indonesian, active/runner segment, pre- or post-workout framing, practical not aesthetic', 'manual', 1, 'active_runner', 'problem_solution'),
('nctr', 'tiktok_caption', 'NCTR honey TikTok caption, Indonesian, mom segment, kids' immunity framing, before-after pattern, everyday household context', 'manual', 1, 'mom', 'habit_formation'),
('nctr', 'tiktok_caption', 'NCTR honey TikTok caption, Indonesian, cooking/F&B segment, use in cooking, practical substitution idea, simple and direct', 'manual', 1, 'cooking_fb', 'use_case_education'),
('nctr', 'tiktok_caption', 'NCTR honey TikTok caption, Indonesian, youth segment, daily habit framing, energy/productivity angle, not sports-specific', 'manual', 2, 'youth', 'habit_formation'),
('nctr', 'tiktok_caption', 'NCTR honey TikTok caption, Indonesian, general household, price-value framing, comparison to sugar or other sweeteners in the kitchen', 'manual', 2, 'household', 'practical_offer'),

-- NCTR · IG Caption
('nctr', 'ig_caption', 'NCTR honey IG caption, Indonesian, runner context, morning routine, honey as pre-run fuel — specific use moment not vague wellness', 'manual', 2, 'active_runner', 'use_case_education'),
('nctr', 'ig_caption', 'NCTR honey IG caption, Indonesian, family context, multiple use moments in one household — cooking, drink, kids', 'manual', 2, 'household', 'habit_formation'),
('nctr', 'ig_caption', 'NCTR honey IG caption, Indonesian, social proof from everyday users, someone who switched to NCTR and what actually changed', 'manual', 3, 'household', 'social_proof'),

-- NCTR · Ad Copy
('nctr', 'ad_copy', 'NCTR honey ad copy, Indonesian, Tokopedia/Shopee performance ad, hook + benefit + CTA, runner segment, short and direct', 'manual', 1, 'active_runner', 'problem_solution'),
('nctr', 'ad_copy', 'NCTR honey ad copy, Indonesian, Facebook/Meta feed ad, mom segment, immunity framing, before-after structure, primary buyer concern addressed', 'manual', 1, 'mom', 'problem_solution'),
('nctr', 'ad_copy', 'NCTR honey ad copy, Indonesian, retargeting copy, general audience, why choose honey over sugar, practical household angle', 'manual', 2, 'household', 'practical_offer'),

-- NCTR · Product Desc
('nctr', 'product_desc', 'NCTR honey product description, Indonesian, Tokopedia listing, practical and clear, use cases listed, no vague claims', 'manual', 2, 'household', 'use_case_education'),

-- Professor Bee · IG Caption
('profbee', 'ig_caption', 'Professor Bee IG caption, Indonesian, category education: what does single-origin mean and why does it matter for honey', 'manual', 1, null, 'category_decoding'),
('profbee', 'ig_caption', 'Professor Bee IG caption, Indonesian, myth bust: raw honey vs regular honey, what the difference actually is (not vague "healthier")', 'manual', 1, null, 'myth_busting'),
('profbee', 'ig_caption', 'Professor Bee IG caption, Indonesian, sensory education: how to taste honey, what to look for in color, texture, flavor — practical not preachy', 'manual', 1, null, 'sensory_education'),
('profbee', 'ig_caption', 'Professor Bee IG caption, Indonesian, sourcing transparency: how to know if what you're buying is real — what labels to look for and ignore', 'manual', 2, null, 'sourcing_transparency'),
('profbee', 'ig_caption', 'Professor Bee IG caption, Indonesian, consumer literacy: the honey industry gap — what most brands don't tell you and why', 'manual', 2, null, 'industry_reform'),
('profbee', 'ig_caption', 'Professor Bee IG caption, Indonesian, the decode framing: what is actually in your honey jar — reading the label correctly', 'manual', 2, null, 'category_decoding'),

-- Professor Bee · TikTok Caption
('profbee', 'tiktok_caption', 'Professor Bee TikTok caption, Indonesian, hook-first myth bust about honey, category education energy, first line creates strong curiosity gap', 'manual', 1, null, 'myth_busting'),
('profbee', 'tiktok_caption', 'Professor Bee TikTok caption, Indonesian, sensory education: show don't tell, how someone's first taste of single-origin honey changes their category understanding', 'manual', 1, null, 'sensory_education'),

-- Professor Bee · Video Script
('profbee', 'video_script', 'Professor Bee short video script (30s), Indonesian, myth bust: does honey expire, clear educational arc, ends with practical takeaway', 'manual', 2, null, 'myth_busting'),
('profbee', 'video_script', 'Professor Bee short video script (30s), Indonesian, how to read a honey label, step by step, clear and confident not condescending', 'manual', 2, null, 'consumer_literacy'),

-- Professor Bee · Email
('profbee', 'email', 'Professor Bee welcome email, Indonesian, new subscriber, educate without overwhelming, one idea clearly explained, builds trust not urgency', 'manual', 3, null, 'category_decoding'),
('profbee', 'email', 'Professor Bee educational newsletter email, Indonesian, one myth per email format, concise, credible, no promotional content', 'manual', 3, null, 'myth_busting');
