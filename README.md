# Eureka Giftwrap

This is an ember-cli project to help pull ember addons into our sprockets based ember app. Under the hood it uses an addon called Giftwrap to produce an addon.js and addon.map that get pulled into eureka.

The versions of ember and ember-data must match what we are using in eureka otherwise the addons will not work.

## Versions - from bower.json

```
"ember": "1.13.0"
```

## Addons

```
liquid-fire
ember-autoresize
ember-attachment
```

## First time setup

```bash
git clone https://github.com/TutoringAustralasia/eureka-giftwrap.git
cd eureka-giftwrap
npm install
```

## Adding new dependency

```bash
npm install <addon-name> --save-dev
ember giftwrap
```
Copy the `addons.map` and `addons.js` in `/wrapped` to the `addons` folder of the ember app in Eureka and `addons.css` to the addons folder under stylesheets for the classroom module in eureka. Something like the following is what you want to type.
```
cp wrapped/addons.map ../eureka/app/classroom/assets/javascripts/classroom/addons/
cp wrapped/addons.js ../eureka/app/classroom/assets/javascripts/classroom/addons/
cp wrapped/addons.css ../eureka/app/classroom/assets/stylesheets/classroom/addons/
```

