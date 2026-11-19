--
-- PostgreSQL database dump
--

\restrict 0Im5EoAs6p5Unfzxr5rgW0E2LgqfguJZO3z1kJXebENlz693h3g1WE0WG9FP8K1

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: delivery_area_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_area_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_area_id uuid NOT NULL,
    currency character varying(3) NOT NULL,
    amount_minor bigint NOT NULL,
    max_weight_grams integer NOT NULL,
    max_length_cm integer NOT NULL,
    max_width_cm integer NOT NULL,
    max_height_cm integer NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    CONSTRAINT delivery_area_rates_currency_allowed CHECK (((currency)::text = ANY ((ARRAY['NGN'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT delivery_area_rates_fee_positive CHECK ((amount_minor > 0)),
    CONSTRAINT delivery_area_rates_limits_positive CHECK (((max_weight_grams > 0) AND (max_length_cm > 0) AND (max_width_cm > 0) AND (max_height_cm > 0)))
);


--
-- Name: delivery_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state character varying(100) NOT NULL,
    name character varying(150) NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    CONSTRAINT delivery_areas_name_not_blank CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT delivery_areas_state_not_blank CHECK ((length(TRIM(BOTH FROM state)) > 0))
);


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_tokens (
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_drafts (
    user_id uuid NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_drafts_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    product_name character varying(200) NOT NULL,
    sku character varying(100) NOT NULL,
    size character varying(50),
    colour character varying(50),
    quantity integer NOT NULL,
    unit_price_minor bigint NOT NULL,
    line_total_minor bigint NOT NULL,
    listed_currency character varying(3),
    listed_unit_price_minor bigint,
    CONSTRAINT order_items_listed_price_check CHECK ((((listed_currency IS NULL) AND (listed_unit_price_minor IS NULL)) OR ((listed_currency IS NOT NULL) AND ((listed_currency)::text = ANY ((ARRAY['NGN'::character varying, 'USD'::character varying])::text[])) AND (listed_unit_price_minor IS NOT NULL) AND (listed_unit_price_minor >= 0)))),
    CONSTRAINT order_items_price_positive CHECK ((unit_price_minor > 0)),
    CONSTRAINT order_items_quantity_positive CHECK ((quantity > 0)),
    CONSTRAINT order_items_total_correct CHECK ((line_total_minor = ((quantity)::bigint * unit_price_minor)))
);


--
-- Name: order_shipping_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_shipping_addresses (
    order_id uuid NOT NULL,
    recipient_name character varying(200) NOT NULL,
    phone character varying(30) NOT NULL,
    address_line1 character varying(250) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100) CONSTRAINT order_shipping_addresses_state_region_not_null NOT NULL,
    country_code character varying(2) DEFAULT 'NG'::character varying NOT NULL,
    CONSTRAINT shipping_country_code_format CHECK (((country_code)::text ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT shipping_country_nigeria_only CHECK (((country_code)::text = 'NG'::text)),
    CONSTRAINT shipping_required_fields_not_blank CHECK (((length(TRIM(BOTH FROM recipient_name)) > 0) AND (length(TRIM(BOTH FROM phone)) > 0) AND (length(TRIM(BOTH FROM address_line1)) > 0) AND (length(TRIM(BOTH FROM city)) > 0) AND (length(TRIM(BOTH FROM state)) > 0)))
);


--
-- Name: order_stock_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_stock_allocations (
    order_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    quantity integer NOT NULL,
    status text DEFAULT 'allocated'::text NOT NULL,
    allocated_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone,
    consumed_at timestamp with time zone,
    CONSTRAINT order_stock_allocation_state_valid CHECK ((((status = 'allocated'::text) AND (released_at IS NULL) AND (consumed_at IS NULL)) OR ((status = 'released'::text) AND (released_at IS NOT NULL) AND (consumed_at IS NULL)) OR ((status = 'consumed'::text) AND (consumed_at IS NOT NULL) AND (released_at IS NULL)))),
    CONSTRAINT order_stock_allocations_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_stock_allocations_status_check CHECK ((status = ANY (ARRAY['allocated'::text, 'released'::text, 'consumed'::text])))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    status character varying(30) DEFAULT 'awaiting_delivery_quote'::character varying NOT NULL,
    currency character varying(3) NOT NULL,
    subtotal_minor bigint NOT NULL,
    shipping_minor bigint,
    total_minor bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    cancellation_reason text,
    payment_method text DEFAULT 'payment_on_delivery'::text NOT NULL,
    payment_status text DEFAULT 'uncollected'::text NOT NULL,
    payment_collected_at timestamp with time zone,
    payment_collected_by uuid,
    shipped_at timestamp with time zone,
    shipped_by uuid,
    delivered_at timestamp with time zone,
    delivered_by uuid,
    usd_to_ngn_rate numeric(18,6),
    CONSTRAINT orders_amounts_valid CHECK (((((status)::text = ANY ((ARRAY['awaiting_delivery_quote'::character varying, 'cancelled'::character varying])::text[])) AND (shipping_minor IS NULL) AND (total_minor IS NULL)) OR (((status)::text <> 'awaiting_delivery_quote'::text) AND (shipping_minor IS NOT NULL) AND (total_minor IS NOT NULL) AND (shipping_minor >= 0) AND (total_minor = (subtotal_minor + shipping_minor))))),
    CONSTRAINT orders_cancellation_reason_valid CHECK (((cancellation_reason IS NULL) OR ((char_length(btrim(cancellation_reason)) >= 1) AND (char_length(btrim(cancellation_reason)) <= 500)))),
    CONSTRAINT orders_currency_allowed CHECK (((currency)::text = ANY ((ARRAY['NGN'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT orders_payment_collection_valid CHECK ((((payment_status = 'uncollected'::text) AND (payment_collected_at IS NULL) AND (payment_collected_by IS NULL)) OR ((payment_status = 'collected'::text) AND (payment_collected_at IS NOT NULL) AND (total_minor IS NOT NULL) AND (total_minor > 0)))),
    CONSTRAINT orders_payment_method_allowed CHECK ((payment_method = 'payment_on_delivery'::text)),
    CONSTRAINT orders_payment_status_allowed CHECK ((payment_status = ANY (ARRAY['uncollected'::text, 'collected'::text]))),
    CONSTRAINT orders_status_allowed CHECK (((status)::text = ANY ((ARRAY['awaiting_delivery_quote'::character varying, 'pending'::character varying, 'confirmed'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT orders_subtotal_valid CHECK ((subtotal_minor >= 0)),
    CONSTRAINT orders_usd_to_ngn_rate_check CHECK (((usd_to_ngn_rate > (0)::numeric) AND (usd_to_ngn_rate < 'Infinity'::numeric)))
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_variant_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    currency character varying(3) NOT NULL,
    amount_minor bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT variant_prices_amount_positive CHECK ((amount_minor > 0)),
    CONSTRAINT variant_prices_currency_allowed CHECK (((currency)::text = ANY ((ARRAY['NGN'::character varying, 'USD'::character varying])::text[])))
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku character varying(100) NOT NULL,
    size character varying(50),
    colour character varying(50),
    stock_quantity integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    currency character varying(3) NOT NULL,
    packed_weight_grams integer,
    packed_length_cm integer,
    packed_width_cm integer,
    packed_height_cm integer,
    CONSTRAINT variants_colour_not_blank CHECK (((colour IS NULL) OR (length(TRIM(BOTH FROM colour)) > 0))),
    CONSTRAINT variants_packed_height_positive CHECK ((packed_height_cm > 0)),
    CONSTRAINT variants_packed_length_positive CHECK ((packed_length_cm > 0)),
    CONSTRAINT variants_packed_weight_positive CHECK ((packed_weight_grams > 0)),
    CONSTRAINT variants_packed_width_positive CHECK ((packed_width_cm > 0)),
    CONSTRAINT variants_size_not_blank CHECK (((size IS NULL) OR (length(TRIM(BOTH FROM size)) > 0))),
    CONSTRAINT variants_sku_not_blank CHECK ((length(TRIM(BOTH FROM sku)) > 0)),
    CONSTRAINT variants_stock_not_negative CHECK ((stock_quantity >= 0))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    currency character varying(3) DEFAULT 'NGN'::character varying NOT NULL,
    requires_delivery_quote boolean DEFAULT false NOT NULL,
    image_key text,
    CONSTRAINT products_currency_allowed CHECK (((currency)::text = ANY ((ARRAY['NGN'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT products_image_key_valid CHECK (((image_key IS NULL) OR (image_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'::text))),
    CONSTRAINT products_name_not_blank CHECK ((length(TRIM(BOTH FROM name)) > 0))
);


--
-- Name: store_exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_exchange_rates (
    currency_pair text NOT NULL,
    rate numeric(18,6) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_exchange_rates_currency_pair_check CHECK ((currency_pair = 'USD_NGN'::text)),
    CONSTRAINT store_exchange_rates_rate_check CHECK (((rate > (0)::numeric) AND (rate < 'Infinity'::numeric)))
);


--
-- Name: support_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    guest_email text,
    guest_email_verified_at timestamp with time zone,
    guest_access_token_hash text,
    guest_email_token_hash text,
    guest_email_token_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_conversations_check CHECK ((((customer_id IS NOT NULL) AND (guest_access_token_hash IS NULL)) OR ((customer_id IS NULL) AND (guest_access_token_hash IS NOT NULL)))),
    CONSTRAINT support_conversations_check1 CHECK (((guest_email_verified_at IS NULL) OR (guest_email IS NOT NULL))),
    CONSTRAINT support_conversations_check2 CHECK (((guest_email_token_hash IS NULL) = (guest_email_token_expires_at IS NULL)))
);


--
-- Name: support_email_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_email_notifications (
    message_id bigint NOT NULL,
    recipient_email text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT support_email_notifications_attempts_check CHECK ((attempts >= 0))
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id bigint NOT NULL,
    conversation_id uuid NOT NULL,
    sender_role text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    CONSTRAINT support_messages_body_check CHECK (((char_length(btrim(body)) >= 1) AND (char_length(btrim(body)) <= 2000))),
    CONSTRAINT support_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['customer'::text, 'admin'::text])))
);


--
-- Name: support_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.support_messages ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.support_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'customer'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email_verified_at timestamp with time zone,
    suspended_at timestamp with time zone,
    auth_version integer DEFAULT 0 NOT NULL,
    CONSTRAINT users_auth_version_nonnegative CHECK ((auth_version >= 0)),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['customer'::text, 'admin'::text])))
);


--
-- Name: delivery_area_rates delivery_area_rates_one_per_currency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_area_rates
    ADD CONSTRAINT delivery_area_rates_one_per_currency UNIQUE (delivery_area_id, currency);


--
-- Name: delivery_area_rates delivery_area_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_area_rates
    ADD CONSTRAINT delivery_area_rates_pkey PRIMARY KEY (id);


--
-- Name: delivery_areas delivery_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_areas
    ADD CONSTRAINT delivery_areas_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (user_id);


--
-- Name: email_verification_tokens email_verification_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: order_drafts order_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_drafts
    ADD CONSTRAINT order_drafts_pkey PRIMARY KEY (user_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_variant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_unique UNIQUE (order_id, variant_id);


--
-- Name: order_shipping_addresses order_shipping_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_shipping_addresses
    ADD CONSTRAINT order_shipping_addresses_pkey PRIMARY KEY (order_id);


--
-- Name: order_stock_allocations order_stock_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_stock_allocations
    ADD CONSTRAINT order_stock_allocations_pkey PRIMARY KEY (order_id, variant_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (user_id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: product_variant_prices product_variant_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_prices
    ADD CONSTRAINT product_variant_prices_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_id_currency_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_id_currency_unique UNIQUE (id, currency);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: user_sessions session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: store_exchange_rates store_exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_exchange_rates
    ADD CONSTRAINT store_exchange_rates_pkey PRIMARY KEY (currency_pair);


--
-- Name: support_conversations support_conversations_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_customer_id_key UNIQUE (customer_id);


--
-- Name: support_conversations support_conversations_guest_access_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_guest_access_token_hash_key UNIQUE (guest_access_token_hash);


--
-- Name: support_conversations support_conversations_guest_email_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_guest_email_token_hash_key UNIQUE (guest_email_token_hash);


--
-- Name: support_conversations support_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_pkey PRIMARY KEY (id);


--
-- Name: support_email_notifications support_email_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_email_notifications
    ADD CONSTRAINT support_email_notifications_pkey PRIMARY KEY (message_id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: product_variant_prices variant_prices_one_per_currency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_prices
    ADD CONSTRAINT variant_prices_one_per_currency UNIQUE (variant_id, currency);


--
-- Name: product_variant_prices variant_prices_one_per_variant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_prices
    ADD CONSTRAINT variant_prices_one_per_variant UNIQUE (variant_id);


--
-- Name: product_variants variants_id_currency_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT variants_id_currency_unique UNIQUE (id, currency);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.user_sessions USING btree (expire);


--
-- Name: delivery_areas_location_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX delivery_areas_location_unique ON public.delivery_areas USING btree (lower(TRIM(BOTH FROM state)), lower(TRIM(BOTH FROM name)));


--
-- Name: products_image_key_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_image_key_unique ON public.products USING btree (image_key) WHERE (image_key IS NOT NULL);


--
-- Name: support_email_notifications_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_email_notifications_pending_idx ON public.support_email_notifications USING btree (next_attempt_at) WHERE (sent_at IS NULL);


--
-- Name: support_messages_conversation_id_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_messages_conversation_id_id_idx ON public.support_messages USING btree (conversation_id, id DESC);


--
-- Name: delivery_area_rates delivery_area_rates_delivery_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_area_rates
    ADD CONSTRAINT delivery_area_rates_delivery_area_id_fkey FOREIGN KEY (delivery_area_id) REFERENCES public.delivery_areas(id);


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_drafts order_drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_drafts
    ADD CONSTRAINT order_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: order_shipping_addresses order_shipping_addresses_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_shipping_addresses
    ADD CONSTRAINT order_shipping_addresses_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_stock_allocations order_stock_allocations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_stock_allocations
    ADD CONSTRAINT order_stock_allocations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;


--
-- Name: order_stock_allocations order_stock_allocations_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_stock_allocations
    ADD CONSTRAINT order_stock_allocations_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;


--
-- Name: orders orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_delivered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivered_by_fkey FOREIGN KEY (delivered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_payment_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_payment_collected_by_fkey FOREIGN KEY (payment_collected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_shipped_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shipped_by_fkey FOREIGN KEY (shipped_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_variant_prices product_variant_prices_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_prices
    ADD CONSTRAINT product_variant_prices_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: support_conversations support_conversations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_email_notifications support_email_notifications_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_email_notifications
    ADD CONSTRAINT support_email_notifications_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.support_messages(id) ON DELETE CASCADE;


--
-- Name: support_messages support_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.support_conversations(id) ON DELETE CASCADE;


--
-- Name: product_variant_prices variant_prices_currency_match; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_prices
    ADD CONSTRAINT variant_prices_currency_match FOREIGN KEY (variant_id, currency) REFERENCES public.product_variants(id, currency);


--
-- Name: product_variants variants_product_currency_match; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT variants_product_currency_match FOREIGN KEY (product_id, currency) REFERENCES public.products(id, currency);


--
-- PostgreSQL database dump complete
--

\unrestrict 0Im5EoAs6p5Unfzxr5rgW0E2LgqfguJZO3z1kJXebENlz693h3g1WE0WG9FP8K1

