(() => {
    // MORE CODE...
    const phoneHome = (B = !1, re) => ({
        locks: [ft.CONFIG, ft.NOTIFICATION_PERSIST, ft.PHONE_HOME],
        saga: function* phoneHomeSaga(ie) {
            if (yield (0, ye.select)(nt.getIsStandaloneClient))
                throw new Error(Le.NOT_AVAILABLE_IN_STANDALONE);
            if (yield (0, ye.select)(nt.getHasNeverAgreedToAnyEula)) return;
            const se =
                !ce.default.get(
                    Bt.availablePromises.INITIAL_PHONE_HOME,
                    yield (0, ye.select)(Wt.getRenderAwaitablePromises),
                ) || B;
            (se &&
                (yield (0, ye.put)(
                    (0, Gt.PromiseUpdated)([Bt.availablePromises.INITIAL_PHONE_HOME], ie.getPromise()),
                )),
                yield (0, ye.put)((0, zt.PhoneHomeStarted)(se)),
                re && (yield (0, ye.call)(re)));
            const le = yield (0, ye.call)(kr.getAppSettingsService),
                ge = yield (0, ye.call)(kr.getSecureStorageService),
                Ie = yield (0, ye.call)([ge, ge.getAppSecureStorage]);
            try {
                const B = yield (0, ye.select)(Zt.getAccessToken),
                    re = yield (0, ye.call)([Ie, Ie.getPassword], Yt.publicRepoDomainWhitelistKey),
                    ge = (() => {
                        try {
                            return JSON.stringify(re || []);
                        } catch (B) {
                            return "[]";
                        }
                    })(),
                    be = yield (0, ye.call)(pe.v4),
                    Ae = yield (0, ye.select)(nt.getAppId),
                    Le = yield (0, ye.select)(nt.getInstallId),
                    Je = yield (0, ye.select)(nt.getUserId),
                    rt = { "Content-Type": "application/json" },
                    it = {
                        app_id: Ae,
                        app_version: globalThis.version,
                        guid: be,
                        whitelist: (0, ae.createHash)("md5").update(ge).digest("hex"),
                    };
                B ? ((rt.Authorization = `Bearer ${B}`), (it.id = Je)) : (it.install_id = Le);
                const ot = {
                    headers: rt,
                    body: it,
                    method: "POST",
                    url: yield (0, ye.select)(Zt.getPhoneHomeUrl),
                };
                let st;
                try {
                    st = (yield ie.call(er.callNetRequest, ot)).body;
                } catch (B) {
                    if (!(B.statusCode >= 400)) throw B;
                    st = B.body;
                }
                const { code: at } = st,
                    ct = {};
                let ut = null,
                    ft = !1,
                    ht = !1;
                if (
                    at === Ve.apiPhoneHomeRequestCodes.ACTIVATED ||
                    at === Ve.apiPhoneHomeRequestCodes.PENDING_ACTIVATION ||
                    at === Ve.apiPhoneHomeRequestCodes.UNREGISTERED_USER
                ) {
                    const B = yield (0, ye.select)(nt.getIsNormalClient),
                        re = yield (0, ye.select)(nt.getModePrefixString),
                        ae = yield (0, ye.call)(Kt.decodeBody, B, re, st),
                        {
                            guid: pe,
                            features: ge = [],
                            features2: Ae = null,
                            features3: Le = [],
                            features4: Je = null,
                            whitelist: rt = null,
                            isOrgTrialOwner: it = !1,
                        } = ae;
                    (yield (0, ye.put)((0, zt.IsOrgTrialOwnerUpdated)(it)),
                        (ut = ae.availableTrialDays),
                        B &&
                        (be !== pe && (yield ie.spawn(phoneHomeLogout)),
                            rt &&
                            (yield ie.call(updatePublicRepoDomainWhitelist, rt),
                                yield (0, ye.call)(
                                    [Ie, Ie.setPassword],
                                    Yt.publicRepoDomainWhitelistKey,
                                    rt,
                                ))));
                    let ot = Yt.registrationStatus.ACTIVATED;
                    switch (at) {
                      case Ve.apiPhoneHomeRequestCodes.ACTIVATED:
                        ot = Yt.registrationStatus.ACTIVATED;
                        break;
                      case Ve.apiPhoneHomeRequestCodes.PENDING_ACTIVATION:
                        ot = Yt.registrationStatus.PENDING;
                        break;
                      case Ve.apiPhoneHomeRequestCodes.UNREGISTERED_USER:
                      default:
                        ot = Yt.registrationStatus.UNREGISTERED;
                    }
                    yield le.setSetting(["registration", "status"], ot);
                    const mt = yield (0, ye.select)(nt.getLicensedFeatures);
                    (yield le.setSetting(["licensedFeatures"], Le),
                        yield le.setSetting(["userFeatures"], ge),
                        yield (0, ye.call)(
                            [Ie, Ie.setPassword],
                            Yt.lastPhoneHomeTimeKey,
                            yield (0, ye.call)(Date.now),
                        ));
                    const didHaveFeature = (B) => ce.default.includes(B, mt),
                        gt = {
                            hasAdvancedLicense: didHaveFeature(Yt.licensedFeatures.advanced),
                            hasEnterprise: didHaveFeature(Yt.licensedFeatures.enterprise),
                            hasOrgTrial: didHaveFeature(Yt.licensedFeatures.enterpriseTrial),
                            hasPro:
                                didHaveFeature(Yt.licensedFeatures.pro) &&
                                !didHaveFeature(Yt.licensedFeatures.advanced),
                            hasSoloTrial: didHaveFeature(Yt.licensedFeatures.trial),
                            hasStudent: didHaveFeature(Yt.licensedFeatures.student),
                            hasTeamsLicense: didHaveFeature(Yt.licensedFeatures.teamsLicense),
                        },
                        doesHaveFeature = (B) => ce.default.includes(B, Le),
                        Ot = {
                            hasAdvancedLicense: doesHaveFeature(Yt.licensedFeatures.advanced),
                            hasEnterprise: doesHaveFeature(Yt.licensedFeatures.enterprise),
                            hasOrgTrial: doesHaveFeature(Yt.licensedFeatures.enterpriseTrial),
                            hasPro:
                                doesHaveFeature(Yt.licensedFeatures.pro) &&
                                !doesHaveFeature(Yt.licensedFeatures.advanced),
                            hasSoloTrial: doesHaveFeature(Yt.licensedFeatures.trial),
                            hasStudent: doesHaveFeature(Yt.licensedFeatures.student),
                            hasTeamsLicense: doesHaveFeature(Yt.licensedFeatures.teamsLicense),
                        },
                        Dt = !gt.hasSoloTrial && !gt.hasOrgTrial && (Ot.hasSoloTrial || Ot.hasOrgTrial),
                        Bt = (gt.hasSoloTrial || gt.hasOrgTrial) && !Ot.hasSoloTrial && !Ot.hasOrgTrial,
                        Gt = gt.hasStudent && !Ot.hasStudent,
                        Wt = gt.hasAdvancedLicense || gt.hasTeamsLicense || gt.hasPro || gt.hasEnterprise;
                    ft = Ot.hasAdvancedLicense || Ot.hasTeamsLicense || Ot.hasPro || Ot.hasEnterprise;
                    const Jt = Wt && !ft;
                    ht = ft;
                    const { hasSeenTrialStartedModal: Qt, userMilestones: er } = yield (0, ye.select)(
                        nt.getAppSettings,
                    ),
                        tr = yield (0, ye.select)(nt.getIsOnRegisteredTrial),
                        rr = yield (0, ye.select)(Zt.getIsLoggedIn);
                    (!Ot.hasStudent && (Dt || (!Qt && ot === Yt.registrationStatus.ACTIVATED && tr))
                        ? er.trialExtensionActivated
                            ? (yield ie.call(
                                tt.setAppSetting,
                                ["userMilestones", "trialExtensionActivated"],
                                !1,
                            ),
                                yield ie.call(tt.setAppSetting, ["hasSeenTrialStartedModal"], !0))
                            : (yield ie.call(It.postLocalNotification, {
                                createdAt: new Date(),
                                event: Tt.event.TRIAL_STARTED,
                                contentType: Tt.contentType.SYSTEM,
                                notificationType: Tt.notificationType.SYSTEM,
                            }),
                                yield ie.call(
                                    pt.sendSagaToCurrentWindowOrSaveForLater,
                                    dt.REQUESTABLE_SAGA_IDENTIFIERS.Registration.showTrialStartedModal,
                                ))
                        : !Ot.hasStudent && Bt
                            ? Jt && (yield ie.call(handleTrialEnded, er, gt.hasOrgTrial))
                            : Wt && !ft && (yield ie.call(showLicenseExpiredForm, Gt)),
                        ot === Yt.registrationStatus.ACTIVATED &&
                        rr &&
                        (yield ie.call(tt.setUserMilestone, Ve.userMilestones.startATrial)),
                        ht && (yield (0, ye.put)((0, zt.PrivateRepoDetectedFormsAllHidden)())),
                        yield ie.call(tt.updateAvailableTrialDays, ut ?? null),
                        yield (0, ye.put)((0, et.AccessStateUpdated)({ ...Je })));
                    if (yield (0, ye.select)(nt.getIsSelfHostedClient)) {
                        let B = null;
                        if (null !== Ae) {
                            B = (yield (0, ye.call)(Mr.sanitizeDate, Ae)).getTime();
                        }
                        (yield (0, ye.call)([Ie, Ie.setPassword], Yt.licenseExpiresAtKey, B),
                            yield (0, ye.put)((0, et.LicenseExpirationUpdated)(B)));
                        (yield (0, ye.select)(nt.getIsLicensedSelfHosted)) ||
                            (yield ie.spawn(phoneHomeLogout), (ct.deleteAccessToken = !0));
                    }
                    const ir = yield (0, ye.select)(Zt.getTryShowPrivateRepoDetectedFormById),
                        sr = ce.default.some(Boolean, ce.default.values(ir));
                    se &&
                        ot === Yt.registrationStatus.PENDING &&
                        sr &&
                        (yield ie.call(setAskVerifyEmail, !0));
                } else
                    at === Ve.apiPhoneHomeRequestCodes.INVALID_ID_OR_TOKEN &&
                        (yield ie.spawn(phoneHomeLogout), (ct.deleteAccessToken = !0));
                return (
                    ct.deleteAccessToken && (yield ie.call(clearAccessToken)),
                    yield (0, ye.put)((0, zt.PhoneHomeFinished)()),
                    yield ie.spawn(fetchLimits),
                    ct
                );
            } catch (B) {
                try {
                    const re = yield (0, ye.select)(nt.getIsSelfHostedClient),
                        se = yield (0, ye.select)(nt.getIsLicensedSelfHosted);
                    if (re && !se) yield ie.spawn(phoneHomeLogout);
                    else if (yield (0, ye.select)(nt.getIsNormalClient)) {
                        const B = Number(
                            yield (0, ye.call)([Ie, Ie.getPassword], Yt.lastPhoneHomeTimeKey),
                        );
                        Number.isFinite(B) &&
                            B + Yt.PHONE_HOME_FAILURE_TIME_LIMIT < (yield (0, ye.call)(Date.now))
                            ? yield ie.spawn(phoneHomeLogout, !0)
                            : "number" != typeof (yield (0, ye.select)(nt.getAvailableTrialDays)) &&
                            (yield ie.call(tt.updateAvailableTrialDays, Yt.DEFAULT_AVAILABLE_TRIAL_DAYS));
                    }
                    throw B;
                } finally {
                    yield (0, ye.put)((0, zt.PhoneHomeFinished)());
                }
            }
        },
    });
    // MORE CODE...
})();
